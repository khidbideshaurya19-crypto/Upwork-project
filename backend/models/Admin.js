const { db, convertTimestamps } = require('../firebase');
const bcryptjs = require('bcryptjs');

const col = () => db.collection('admins');

class Admin {
  constructor(data) {
    this._id = null;
    this.id = null;
    this._isNew = true;
    this._passwordChanged = false;
    Object.assign(this, data);
  }

  async save() {
    if (this._isNew || this._passwordChanged) {
      const salt = await bcryptjs.genSalt(10);
      this.password = await bcryptjs.hash(this.password, salt);
      this._passwordChanged = false;
    }

    const skip = new Set(['_id', 'id', '_isNew', '_passwordChanged']);
    const data = {};
    for (const [k, v] of Object.entries(this)) {
      if (!skip.has(k) && typeof v !== 'function') data[k] = v;
    }
    data.updatedAt = new Date();

    if (this._isNew) {
      data.createdAt = new Date();
      const ref = await col().add(data);
      this._id = ref.id;
      this.id = ref.id;
      this._isNew = false;
    } else {
      await col().doc(this._id).update(data);
    }
    return this;
  }

  async comparePassword(candidatePassword) {
    return bcryptjs.compare(candidatePassword, this.password);
  }

  select(fields) {
    const skip = new Set(['_id', 'id', '_isNew', '_passwordChanged']);
    if (typeof fields === 'string') {
      fields.split(' ').forEach(f => { if (f.startsWith('-')) skip.add(f.slice(1)); });
    }
    const obj = { _id: this._id, id: this._id };
    for (const [k, v] of Object.entries(this)) {
      if (!skip.has(k) && typeof v !== 'function') obj[k] = v;
    }
    return obj;
  }

  static _fromDoc(doc) {
    if (!doc || !doc.exists) return null;
    const a = new Admin(convertTimestamps(doc.data()));
    a._id = doc.id; a.id = doc.id; a._isNew = false;
    return a;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const doc = await col().doc(String(id)).get();
      return Admin._fromDoc(doc);
    } catch { return null; }
  }

  static async findOne(query) {
    try {
      let ref = col();
      for (const [k, v] of Object.entries(query)) {
        if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') {
          ref = ref.where(k, '==', v);
        }
      }
      const snap = await ref.limit(1).get();
      if (snap.empty) return null;
      return Admin._fromDoc(snap.docs[0]);
    } catch { return null; }
  }
}

module.exports = Admin;

/* eslint-disable -- legacy Mongoose schema kept as reference only
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
*/
