const Group = require('../models/Group');
const User = require('../models/User');

const createGroup = async (req, res) => {
  const { name } = req.body;

  if (!name) return res.status(400).json({ message: 'Group name is required' });

  const group = await Group.create({
    name,
    createdBy: req.user._id,
    members: [{ user: req.user._id, role: 'Admin' }],
    activityLog: [{ message: `${req.user.name} created the group.` }],
  });

  res.status(201).json(group);
};

const getGroups = async (req, res) => {
  const groups = await Group.find({ 'members.user': req.user._id }).populate('members.user', 'name email');
  res.json(groups);
};

const updateGroup = async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  const isAdmin = group.members.some(
    m => m.user.toString() === req.user._id.toString() && m.role === 'Admin'
  );

  if (!isAdmin) return res.status(403).json({ message: 'Only admins can update the group' });

  group.name = req.body.name || group.name;
  if (req.body.budgetLimit !== undefined) group.budgetLimit = req.body.budgetLimit;
  group.activityLog.push({ message: `${req.user.name} updated the group name or budget.` });

  await group.save();
  res.json(group);
};

const deleteGroup = async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  const isAdmin = group.members.some(
    m => m.user.toString() === req.user._id.toString() && m.role === 'Admin'
  );

  if (!isAdmin) return res.status(403).json({ message: 'Only admins can delete the group' });

  await group.remove();
  res.json({ message: 'Group deleted' });
};

const addMember = async (req, res) => {
  const { userId, role } = req.body;
  const group = await Group.findById(req.params.id);

  const isAdmin = group.members.some(
    m => m.user.toString() === req.user._id.toString() && m.role === 'Admin'
  );

  if (!isAdmin) return res.status(403).json({ message: 'Only admins can add members' });

  if (group.members.some(m => m.user.toString() === userId)) {
    return res.status(400).json({ message: 'User already in group' });
  }

  group.members.push({ user: userId, role: role || 'Member' });
  group.activityLog.push({ message: `${req.user.name} added a new member.` });
  await group.save();

  res.json(group);
};

const removeMember = async (req, res) => {
  const { userId } = req.body;
  const group = await Group.findById(req.params.id);

  const isAdmin = group.members.some(
    m => m.user.toString() === req.user._id.toString() && m.role === 'Admin'
  );

  if (!isAdmin) return res.status(403).json({ message: 'Only admins can remove members' });

  group.members = group.members.filter(m => m.user.toString() !== userId);
  group.activityLog.push({ message: `${req.user.name} removed a member.` });
  await group.save();

  res.json(group);
};

module.exports = {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
};
