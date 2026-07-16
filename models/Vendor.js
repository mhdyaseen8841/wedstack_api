const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  packageName: {
    type: String,
    required: true
  },
  totalCost: {
    type: Number,
    required: true,
    default: 0
  },
  deliverables: [String],
  finePrint: [{
    item: String,
    costPerUnit: Number,
    unit: String
  }]
});

const VendorSchema = new mongoose.Schema({
  weddingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wedding',
    required: true
  },
  sideVisibility: {
    type: String,
    enum: ['Groom', 'Bride', 'Shared'],
    required: true,
    default: 'Shared'
  },
  allowCrossView: {
    type: Boolean,
    default: false
  },
  vendorName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true // e.g., 'Photography', 'Catering', 'Events', 'Makeup'
  },
  status: {
    type: String,
    enum: ['Discovered', 'Contacted', 'Quoted', 'Shortlisted', 'Booked'],
    default: 'Discovered'
  },
  packages: [PackageSchema],
  contactNumber: {
    type: String,
    default: ''
  },
  instagramUrl: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema);
