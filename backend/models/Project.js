const { db, convertTimestamps } = require('../firebase');

const col = () => db.collection('projects');

class Project {
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
    const p = new Project(convertTimestamps(doc.data()));
    p._id = doc.id; p.id = doc.id; p._isNew = false;
    return p;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const doc = await col().doc(String(id)).get();
      return Project._fromDoc(doc);
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
    return snap.docs.map(doc => Project._fromDoc(doc));
  }

  static async findByIdAndUpdate(id, update, opts = {}) {
    const raw = update.$set || update;
    const data = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith('$') && v !== undefined) data[k] = v;
    }
    // Handle $inc
    if (update.$inc) {
      const { FieldValue } = require('firebase-admin/firestore');
      for (const [k, v] of Object.entries(update.$inc)) {
        data[k] = FieldValue.increment(v);
      }
    }
    await col().doc(String(id)).update(data);
    if (opts.new) return Project.findById(id);
    return null;
  }

  static async findByIdAndDelete(id) {
    const p = await Project.findById(id);
    if (p) await col().doc(String(id)).delete();
    return p;
  }

  static async deleteMany(query = {}) {
    let ref = col();
    for (const [k, v] of Object.entries(query)) {
      if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') {
        ref = ref.where(k, '==', v);
      }
    }
    const snap = await ref.get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  static async countDocuments(query = {}) {
    const list = await Project.find(query);
    return list.length;
  }
}

// placeholder so require does not break
const projectSchemaProxy = new Proxy({}, {
  get() { return () => projectSchemaProxy; }
});

module.exports = Project;

// Legacy check — prevent old schema code from running
if (false) { const mongoose = require('mongoose'); const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  budgetType: {
    type: String,
    enum: ['fixed', 'hourly'],
    default: 'fixed'
  },
  duration: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'closed'],
    default: 'open'
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicantsCount: {
    type: Number,
    default: 0
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
}
