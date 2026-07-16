const mongoose = require('mongoose');

const NeededServiceSchema = new mongoose.Schema({
  weddingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wedding',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏢'
  },
  brideCompleted: {
    type: Boolean,
    default: false
  },
  groomCompleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('NeededService', NeededServiceSchema);
