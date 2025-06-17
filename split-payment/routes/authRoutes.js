const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, verifyOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.get('/me', protect, getMe);

module.exports = router;
