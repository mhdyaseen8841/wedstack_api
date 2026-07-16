const mongoose = require('mongoose');

const ProgramDetailSchema = new mongoose.Schema({
  weddingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wedding',
    required: true
  },
  category: {
    type: String,
    required: true,
    default: 'Music' // Music, Decor, Special Moments, Custom
  },
  key: {
    type: String,
    required: true // e.g., 'Intro Song', 'Bride Entry Song', 'Cake Flavour'
  },
  value: {
    type: String,
    required: true // e.g., 'ABCD', 'Strawberry Vanilla', etc.
  },
  side: {
    type: String,
    enum: ['Groom', 'Bride', 'Shared'],
    default: 'Shared'
  }
}, { timestamps: true });

module.exports = mongoose.model('ProgramDetail', ProgramDetailSchema);
