const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { auth } = require('../middleware/auth');

// GET /api/search
router.get('/', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const currentUser = req.user;

    if (!query || query.trim() === '') return res.json({ users: [] });

    const searchRole = currentUser.role === 'client' ? 'company' : 'client';
    const q = query.toLowerCase();

    const snap = await db.collection('users').where('role', '==', searchRole).get();
    let users = snap.docs.map(d => {
      const data = d.data();
      delete data.password;
      return { id: d.id, ...data };
    });

    // Client-side filtering (Firestore does not support regex)
    users = users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.location?.toLowerCase().includes(q) ||
      u.industry?.toLowerCase().includes(q) ||
      u.companyName?.toLowerCase().includes(q) ||
      (u.skills && u.skills.some(s => s.toLowerCase().includes(q)))
    ).slice(0, 20);

    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/search/user/:userId
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    const data = userDoc.data();
    delete data.password;
    res.json({ user: { id: userDoc.id, ...data } });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
