const { db, convertTimestamps } = require('../firebase');

const col = () => db.collection('conversations');

class Conversation {
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
    const c = new Conversation(convertTimestamps(doc.data()));
    c._id = doc.id; c.id = doc.id; c._isNew = false;
    return c;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const doc = await col().doc(String(id)).get();
      return Conversation._fromDoc(doc);
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
      return Conversation._fromDoc(snap.docs[0]);
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
    return snap.docs.map(doc => Conversation._fromDoc(doc));
  }

  static async findByIdAndDelete(id) {
    const c = await Conversation.findById(id);
    if (c) await col().doc(String(id)).delete();
    return c;
  }

  static async countDocuments(query = {}) {
    const list = await Conversation.find(query);
    return list.length;
  }
}

module.exports = Conversation;

/* legacy schema — kept for reference only
const mongoose = require('mongoose2');
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
*/
