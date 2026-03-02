const { db, convertTimestamps } = require('../firebase');
const bcrypt = require('bcryptjs');

const col = () => db.collection('users');

// ----- helper: strip internal fields for safe responses -----
function sanitize(u, omit = ['-password']) {
  if (!u) return null;
  const obj = { _id: u._id, id: u._id };
  const skipKeys = new Set(['_isNew', '_passwordChanged', '_id', 'id']);
  omit.forEach(f => { if (f.startsWith('-')) skipKeys.add(f.slice(1)); });
  for (const [k, v] of Object.entries(u)) {
    if (!skipKeys.has(k) && typeof v !== 'function') obj[k] = v;
  }
  return obj;
}

class User {
  constructor(data) {
    this._id = null;
    this.id = null;
    this._isNew = true;
    this._passwordChanged = false;
    Object.assign(this, data);
  }

  isModified(field) {
    if (field === 'password') return this._passwordChanged || this._isNew;
    return false;
  }

  async save() {
    if (this._isNew || this._passwordChanged) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
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
    return bcrypt.compare(candidatePassword, this.password);
  }

  select(fields) {
    return sanitize(this, typeof fields === 'string' ? fields.split(' ') : []);
  }

  toJSON() {
    return sanitize(this, []);
  }

  // Static factory helpers ------------------------------------------------
  static _fromDoc(doc) {
    if (!doc || !doc.exists) return null;
    const u = new User(convertTimestamps(doc.data()));
    u._id = doc.id;
    u.id = doc.id;
    u._isNew = false;
    return u;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const doc = await col().doc(String(id)).get();
      return User._fromDoc(doc);
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
      return User._fromDoc(snap.docs[0]);
    } catch { return null; }
  }

  static async find(query = {}) {
    let ref = col();
    for (const [k, v] of Object.entries(query)) {
      if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') {
        ref = ref.where(k, '==', v);
      }
    }
    const snap = await ref.get();
    return snap.docs.map(doc => User._fromDoc(doc));
  }

  static async findByIdAndUpdate(id, update, opts = {}) {
    const raw = update.$set || update;
    const data = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith('$') && v !== undefined) data[k] = v;
    }
    await col().doc(String(id)).update(data);
    if (opts.new) return User.findById(id);
    return null;
  }

  static async findByIdAndDelete(id) {
    const u = await User.findById(id);
    if (u) await col().doc(String(id)).delete();
    return u;
  }

  static async countDocuments(query = {}) {
    const list = await User.find(query);
    return list.length;
  }
}

User.sanitize = sanitize;
module.exports = User;

/* eslint-disable -- legacy Mongoose schema kept as reference only
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['client', 'company'],
    required: true
  },
  // For companies
  companyName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  jobsPosted: {
    type: Number,
    default: 0
  },
  jobsCompleted: {
    type: Number,
    default: 0
  },
  location: {
    type: String,
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: ''
  },
  // Additional profile fields
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  bio: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  socialLinks: {
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    github: { type: String, trim: true }
  },
  // Company specific fields
  companySize: {
    type: String,
    trim: true
  },
  foundedYear: {
    type: Number
  },
  industry: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
*/
