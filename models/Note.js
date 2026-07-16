const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  weddingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wedding',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['Groom', 'Bride', 'Shared'],
    default: 'Shared'
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);
