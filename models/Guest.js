const mongoose = require('mongoose');

const GuestSchema = new mongoose.Schema({
  weddingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wedding',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['Groom', 'Bride', 'Mutual'],
    required: true
  },
  rsvpStatus: {
    type: String,
    enum: ['Invited', 'Confirmed', 'Declined'],
    default: 'Invited'
  },
  eventAccess: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Guest', GuestSchema);
