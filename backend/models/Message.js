const { db, convertTimestamps } = require('../firebase');

const col = () => db.collection('messages');

class Message {
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
    const m = new Message(convertTimestamps(doc.data()));
    m._id = doc.id; m.id = doc.id; m._isNew = false;
    return m;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const doc = await col().doc(String(id)).get();
      return Message._fromDoc(doc);
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
    return snap.docs.map(doc => Message._fromDoc(doc));
  }

  static async findByIdAndUpdate(id, update, opts = {}) {
    const raw = update.$set || update;
    const data = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith('$') && v !== undefined) data[k] = v;
    }
    await col().doc(String(id)).update(data);
    if (opts.new) return Message.findById(id);
    return null;
  }

  static async findByIdAndDelete(id) {
    const m = await Message.findById(id);
    if (m) await col().doc(String(id)).delete();
    return m;
  }

  static async updateMany(query, update) {
    const msgs = await Message.find(query);
    const raw = update.$set || update;
    const data = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith('$') && v !== undefined) data[k] = v;
    }
    data.updatedAt = new Date();
    const batch = db.batch();
    msgs.forEach(m => batch.update(col().doc(m._id), data));
    await batch.commit();
  }

  static async deleteMany(query = {}) {
    const msgs = await Message.find(query);
    const batch = db.batch();
    msgs.forEach(m => batch.delete(col().doc(m._id)));
    await batch.commit();
  }

  static async countDocuments(query = {}) {
    const list = await Message.find(query);
    return list.length;
  }
}

module.exports = Message;

/* legacy schema — kept for reference only
const mongoose = require('mongoose2');
const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['client', 'company'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read'],
    default: 'pending'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number
  }]
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ conversation: 1, createdAt: -1 });
module.exports = mongoose.model('Message', messageSchema);
*/
