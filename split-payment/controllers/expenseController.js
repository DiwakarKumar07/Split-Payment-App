const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Settlement = require('../models/Settlement');
const { Parser } = require('json2csv');

// Helper to lock expense if older than 7 days
const lockIfOld = async (expense) => {
  const now = new Date();
  const created = new Date(expense.createdAt);
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  if (!expense.locked && diffDays > 7) {
    expense.locked = true;
    await expense.save();
  }
};

// Add a new expense to a group
const addExpense = async (req, res) => {
  const { groupId, payer, amount, category, description, splitType, splits } = req.body;
  const receipt = req.file ? req.file.filename : undefined;
  if (!groupId || !payer || !amount || !category || !splitType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    // Budget check
    const group = await Group.findById(groupId);
    let overLimit = false;
    let total = 0;
    if (group && group.budgetLimit) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthExpenses = await Expense.find({ group: groupId, createdAt: { $gte: start, $lt: end } });
      total = monthExpenses.reduce((sum, e) => sum + e.amount, 0) + Number(amount);
      if (total > group.budgetLimit) overLimit = true;
    }
    const expense = await Expense.create({
      group: groupId,
      payer,
      amount,
      category,
      description,
      splitType,
      splits,
      createdBy: req.user._id,
      receipt,
    });
    res.status(201).json({ expense, overLimit, total, budgetLimit: group ? group.budgetLimit : undefined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all expenses for a group, with optional filters
const getExpenses = async (req, res) => {
  try {
    const { category, minAmount, maxAmount, startDate, endDate } = req.query;
    const filter = { group: req.params.groupId };
    if (category) filter.category = category;
    if (minAmount || maxAmount) filter.amount = {};
    if (minAmount) filter.amount.$gte = Number(minAmount);
    if (maxAmount) filter.amount.$lte = Number(maxAmount);
    if (startDate || endDate) filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
    const expenses = await Expense.find(filter).populate('payer', 'name email');
    // Lock old expenses
    await Promise.all(expenses.map(lockIfOld));
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a comment to an expense
const addComment = async (req, res) => {
  const { expenseId } = req.params;
  const { text, emoji } = req.body;
  if (!text && !emoji) {
    return res.status(400).json({ message: 'Comment text or emoji required' });
  }
  try {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    await lockIfOld(expense);
    if (expense.locked) {
      return res.status(403).json({ message: 'Expense is locked and cannot be commented on' });
    }
    expense.comments.push({ user: req.user._id, text, emoji });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Calculate balances for a group
const getGroupBalances = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const expenses = await Expense.find({ group: groupId });
    const balances = {};
    // Calculate net balance for each user
    expenses.forEach(exp => {
      // Payer gets credited
      balances[exp.payer] = (balances[exp.payer] || 0) + exp.amount;
      // Each split user gets debited
      exp.splits.forEach(split => {
        balances[split.user] = (balances[split.user] || 0) - split.amount;
      });
    });
    // Prepare readable output
    const result = Object.entries(balances).map(([user, balance]) => ({ user, balance }));
    res.json({ balances: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Optimize debts to minimize transactions
const optimizeDebts = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const expenses = await Expense.find({ group: groupId });
    const balances = {};
    expenses.forEach(exp => {
      balances[exp.payer] = (balances[exp.payer] || 0) + exp.amount;
      exp.splits.forEach(split => {
        balances[split.user] = (balances[split.user] || 0) - split.amount;
      });
    });
    // Convert balances to array
    const users = Object.keys(balances);
    const amounts = users.map(u => balances[u]);
    // Greedy settlement
    const settlements = [];
    let i = 0, j = 0;
    const creditors = [], debtors = [];
    users.forEach((u, idx) => {
      if (amounts[idx] > 0) creditors.push({ user: u, amount: amounts[idx] });
      else if (amounts[idx] < 0) debtors.push({ user: u, amount: -amounts[idx] });
    });
    i = 0; j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amount, creditors[j].amount);
      settlements.push({ from: debtors[i].user, to: creditors[j].user, amount: pay });
      debtors[i].amount -= pay;
      creditors[j].amount -= pay;
      if (debtors[i].amount === 0) i++;
      if (creditors[j].amount === 0) j++;
    }
    res.json({ settlements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Record a manual settlement (partial or full payment)
const addSettlement = async (req, res) => {
  const { groupId, from, to, amount, note } = req.body;
  if (!groupId || !from || !to || !amount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const settlement = await Settlement.create({ group: groupId, from, to, amount, note });
    res.status(201).json(settlement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Monthly group summary (spending, top contributors)
const getMonthlySummary = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { year, month } = req.query; // month: 1-12
    if (!year || !month) return res.status(400).json({ message: 'Year and month required' });
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const expenses = await Expense.find({
      group: groupId,
      createdAt: { $gte: start, $lt: end }
    });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const contributors = {};
    expenses.forEach(e => {
      contributors[e.payer] = (contributors[e.payer] || 0) + e.amount;
    });
    // Sort contributors by amount
    const topContributors = Object.entries(contributors)
      .map(([user, amount]) => ({ user, amount }))
      .sort((a, b) => b.amount - a.amount);
    res.json({ total, topContributors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export group expenses to CSV
const exportExpensesCsv = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const expenses = await Expense.find({ group: groupId }).populate('payer', 'name email');
    const fields = ['_id', 'payer.name', 'amount', 'category', 'description', 'splitType', 'createdAt'];
    const opts = { fields };
    const data = expenses.map(e => ({
      _id: e._id,
      'payer.name': e.payer.name,
      amount: e.amount,
      category: e.category,
      description: e.description,
      splitType: e.splitType,
      createdAt: e.createdAt
    }));
    const parser = new Parser(opts);
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('expenses.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addExpense, getExpenses, addComment, getGroupBalances, optimizeDebts, addSettlement, getMonthlySummary, exportExpensesCsv };
