const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['super_admin', 'moderator', 'analyst'],
      default: 'moderator'
    },
    permissions: {
      manageUsers: { type: Boolean, default: false },
      manageProjects: { type: Boolean, default: false },
      manageDisputes: { type: Boolean, default: false },
      viewAnalytics: { type: Boolean, default: false },
      manageTransactions: { type: Boolean, default: false },
      systemSettings: { type: Boolean, default: false }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: Date,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Hash password before saving
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
AdminSchema.methods.comparePassword = async function(password) {
  return await bcryptjs.compare(password, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema);
