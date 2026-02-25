const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false  // Not required - conversation is between client and company, not tied to single project
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: false
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

// Compound index to ensure one conversation per client-company pair
conversationSchema.index({ client: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
