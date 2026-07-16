const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  weddingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wedding',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  category: {
    type: String,
    required: true
  },
  paidBy: {
    type: String,
    enum: ['Groom', 'Bride', 'Shared'],
    default: 'Shared'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date
  },
  advancePaid: {
    type: Number,
    default: 0
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Card', 'Bank Transfer', 'UPI', 'Others'],
    default: 'Cash'
  },
  balanceDueDate: {
    type: Date
  },
  balanceRemarks: {
    type: String,
    default: ''
  },
  neededServiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NeededService'
  },
  installments: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMode: { type: String, default: 'Cash' },
    remarks: { type: String, default: '' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
