const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String },
  splitType: { type: String, enum: ['equal', 'unequal', 'shares', 'exact'], required: true },
  splits: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, amount: Number }],
  receipt: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String, emoji: String }],
  locked: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
