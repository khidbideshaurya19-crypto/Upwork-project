const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quotation: {
    type: Number,
    required: true,
    min: 0
  },
  coverLetter: {
    type: String,
    required: true
  },
  estimatedDuration: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number
  }],
  portfolioLinks: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Compound index to ensure one application per company per project
applicationSchema.index({ project: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
