const express = require('express');
const router = express.Router();
const { createGroup, getGroups, updateGroup, deleteGroup, addMember, removeMember } = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createGroup);
router.get('/', protect, getGroups);
router.put('/:id', protect, updateGroup);
router.delete('/:id', protect, deleteGroup);
router.post('/:id/add-member', protect, addMember);
router.post('/:id/remove-member', protect, removeMember);

module.exports = router;
