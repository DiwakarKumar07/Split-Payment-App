const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      role: {
        type: String,
        enum: ['Admin', 'Member', 'Viewer'],
        default: 'Member',
      },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  activityLog: [
    {
      message: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  budgetLimit: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
