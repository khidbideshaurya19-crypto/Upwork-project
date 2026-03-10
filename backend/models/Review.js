const { db, convertTimestamps } = require('../firebase');

const col = () => db.collection('reviews');

class Review {
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
    const r = new Review(convertTimestamps(doc.data()));
    r._id = doc.id; r.id = doc.id; r._isNew = false;
    return r;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const doc = await col().doc(String(id)).get();
      return Review._fromDoc(doc);
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
    return snap.docs.map(doc => Review._fromDoc(doc));
  }

  static async findOne(query = {}) {
    const list = await Review.find(query);
    return list.length > 0 ? list[0] : null;
  }

  static async deleteOne(query = {}) {
    const item = await Review.findOne(query);
    if (item) {
      await col().doc(item._id).delete();
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }
}

module.exports = Review;
