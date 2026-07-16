const mongoose = require('mongoose');

const WeddingSchema = new mongoose.Schema({
  brideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  groomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  totalBudget: {
    type: Number,
    default: 0
  },
  budgetSplitRatio: {
    type: Number,
    default: 50 // Percentage allocated to Groom side
  },
  groomBudget: {
    type: Number,
    default: 0
  },
  brideBudget: {
    type: Number,
    default: 0
  },
  weddingDate: {
    type: Date
  },
  weddingCode: {
    type: String,
    unique: true
  },
  brideAllowsMutual: {
    type: Boolean,
    default: true
  },
  groomAllowsMutual: {
    type: Boolean,
    default: true
  },
  brideAllowsLedgerShare: {
    type: Boolean,
    default: true
  },
  groomAllowsLedgerShare: {
    type: Boolean,
    default: true
  },
  brideCompletedServices: {
    type: [String],
    default: []
  },
  groomCompletedServices: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Wedding', WeddingSchema);
