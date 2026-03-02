const { db, convertTimestamps } = require('../firebase');

const col = () => db.collection('applications');

class Application {
  constructor(data) {
    this._id = null;
    this.id = null;
    this._isNew = true;
    Object.assign(this, data);
  }

  async save() {
    const skip = new Set(['_id', 'id', '_isNew']);
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

  async deleteOne() {
    if (this._id) await col().doc(this._id).delete();
  }

  toJSON() {
    const obj = { _id: this._id, id: this._id };
    const skip = new Set(['_id', 'id', '_isNew']);
    for (const [k, v] of Object.entries(this)) {
      if (!skip.has(k) && typeof v !== 'function') obj[k] = v;
    }
    return obj;
  }

  static _fromDoc(doc) {
    if (!doc || !doc.exists) return null;
    const a = new Application(convertTimestamps(doc.data()));
    a._id = doc.id; a.id = doc.id; a._isNew = false;
    return a;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const doc = await col().doc(String(id)).get();
      return Application._fromDoc(doc);
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
      return Application._fromDoc(snap.docs[0]);
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
    return snap.docs.map(doc => Application._fromDoc(doc));
  }

  static async findByIdAndUpdate(id, update, opts = {}) {
    const raw = update.$set || update;
    const data = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith('$') && v !== undefined) data[k] = v;
    }
    await col().doc(String(id)).update(data);
    if (opts.new) return Application.findById(id);
    return null;
  }

  static async findByIdAndDelete(id) {
    const a = await Application.findById(id);
    if (a) await col().doc(String(id)).delete();
    return a;
  }

  static async updateMany(query, update) {
    const apps = await Application.find(query);
    const raw = update.$set || update;
    const data = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith('$') && v !== undefined) data[k] = v;
    }
    data.updatedAt = new Date();
    const batch = db.batch();
    apps.forEach(a => batch.update(col().doc(a._id), data));
    await batch.commit();
  }

  static async deleteMany(query = {}) {
    const apps = await Application.find(query);
    const batch = db.batch();
    apps.forEach(a => batch.delete(col().doc(a._id)));
    await batch.commit();
  }

  static async countDocuments(query = {}) {
    const list = await Application.find(query);
    return list.length;
  }
}

module.exports = Application;

/* legacy schema — kept for reference only
const mongoose = require('mongoose2');
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
*/
