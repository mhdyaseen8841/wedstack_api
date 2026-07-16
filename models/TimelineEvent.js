const mongoose = require('mongoose');

const TimelineEventSchema = new mongoose.Schema({
  weddingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wedding',
    required: true
  },
  eventDay: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // e.g., "06:00 AM"
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true,
    default: 30
  },
  activityTitle: {
    type: String,
    required: true
  },
  assignedSide: {
    type: String,
    enum: ['Groom', 'Bride', 'Shared'],
    default: 'Shared'
  },
  coordinatorId: {
    type: String, // e.g. "Uncle Bobby (+1-555-0199)"
    required: true
  },
  linkedVendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  locationName: {
    type: String,
    default: ''
  },
  coordinates: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('TimelineEvent', TimelineEventSchema);
