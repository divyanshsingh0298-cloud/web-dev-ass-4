const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// RBAC demo: admin-only
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

router.patch('/users/:id/role', authenticate, authorize('admin'), async (req, res) => {
  const { role } = req.body;
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'role must be user or admin' });

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// Chat history for a room (any logged-in user)
router.get('/messages/:room', authenticate, async (req, res) => {
  const messages = await Message.find({ room: req.params.room }).sort({ createdAt: -1 }).limit(50);
  res.json(messages.reverse());
});

module.exports = router;
