const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCountClient: {
    type: Number,
    default: 0
  },
  unreadCountCompany: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure one conversation per project-company pair
conversationSchema.index({ project: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
