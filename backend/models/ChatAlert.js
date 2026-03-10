const { db, convertTimestamps } = require('../firebase');

const col = () => db.collection('chatAlerts');

class ChatAlert {
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
    const a = new ChatAlert(convertTimestamps(doc.data()));
    a._id = doc.id; a.id = doc.id; a._isNew = false;
    return a;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const doc = await col().doc(String(id)).get();
      return ChatAlert._fromDoc(doc);
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
    return snap.docs.map(doc => ChatAlert._fromDoc(doc));
  }

  static async findByIdAndUpdate(id, update, opts = {}) {
    const raw = update.$set || update;
    const data = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith('$') && v !== undefined) data[k] = v;
    }
    await col().doc(String(id)).update(data);
    if (opts.new) return ChatAlert.findById(id);
    return null;
  }

  static async findByIdAndDelete(id) {
    const a = await ChatAlert.findById(id);
    if (a) await col().doc(String(id)).delete();
    return a;
  }

  static async countDocuments(query = {}) {
    const list = await ChatAlert.find(query);
    return list.length;
  }
}

module.exports = ChatAlert;
