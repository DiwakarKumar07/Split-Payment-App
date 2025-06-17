const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// In-memory store for OTPs (for demo only)
const otpStore = {};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Authenticate user (step 1: password, send OTP)
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[user._id] = { otp, expires: Date.now() + 5 * 60 * 1000 };
    console.log(`OTP for user ${user.email}: ${otp}`); // In real app, send via email
    return res.json({ message: 'OTP sent to your email (console for demo)', userId: user._id });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
};

// @desc    Verify OTP and return JWT
// @route   POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;
  const entry = otpStore[userId];
  if (!entry) return res.status(400).json({ message: 'No OTP found. Please login again.' });
  if (Date.now() > entry.expires) return res.status(400).json({ message: 'OTP expired. Please login again.' });
  if (entry.otp !== otp) return res.status(400).json({ message: 'Invalid OTP.' });

  // OTP valid, delete from store
  delete otpStore[userId];
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({
    _id: user.id,
    name: user.name,
    email: user.email,
    token: generateToken(user._id),
  });
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  const { _id, name, email } = await User.findById(req.user.id);
  res.status(200).json({ _id, name, email });
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  verifyOtp,
};
