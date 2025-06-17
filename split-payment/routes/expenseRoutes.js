const express = require('express');
const router = express.Router();
const { addExpense, getExpenses, addComment, getGroupBalances, optimizeDebts, addSettlement, getMonthlySummary, exportExpensesCsv } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Add expense with optional receipt upload
router.post('/', protect, upload.single('receipt'), addExpense);
router.get('/:groupId', protect, getExpenses);
router.post('/:expenseId/comment', protect, addComment);
router.get('/:groupId/balances', protect, getGroupBalances);
router.get('/:groupId/optimize', protect, optimizeDebts);
router.post('/settle', protect, addSettlement);
router.get('/:groupId/summary', protect, getMonthlySummary);
router.get('/:groupId/export', protect, exportExpensesCsv);

module.exports = router;
