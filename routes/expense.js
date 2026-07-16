const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// Get all expenses for wedding
router.get('/', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ weddingId: req.user.weddingId });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create expense
router.post('/', auth, async (req, res) => {
  const { title, amount, category, paidBy, isPaid, advancePaid, paymentMode, paidDate, balanceDueDate, balanceRemarks, neededServiceId, installments } = req.body;
  try {
    const expense = new Expense({
      weddingId: req.user.weddingId,
      title,
      amount: Number(amount) || 0,
      category,
      paidBy: paidBy || req.user.side,
      isPaid: isPaid || false,
      paidDate: paidDate || (isPaid ? new Date() : undefined),
      advancePaid: Number(advancePaid) || 0,
      paymentMode: paymentMode || 'Cash',
      balanceDueDate: balanceDueDate || undefined,
      balanceRemarks: balanceRemarks || '',
      neededServiceId: neededServiceId || undefined,
      installments: installments || undefined
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update expense
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.body.isPaid !== undefined) {
      req.body.paidDate = req.body.isPaid ? new Date() : null;
    }
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.user.weddingId },
      req.body,
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, weddingId: req.user.weddingId });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
