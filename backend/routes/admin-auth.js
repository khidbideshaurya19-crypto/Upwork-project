const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../firebase');
const { adminAuth } = require('../middleware/adminAuth');

// POST /api/admin/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const snap = await db.collection('admins').where('email', '==', email.toLowerCase()).limit(1).get();
    if (snap.empty) return res.status(401).json({ message: 'Invalid credentials' });

    const adminDoc = snap.docs[0];
    const admin = { id: adminDoc.id, ...adminDoc.data() };

    if (!admin.isActive) return res.status(403).json({ message: 'Admin account is inactive' });

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

    await db.collection('admins').doc(adminDoc.id).update({ lastLogin: new Date() });

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/admin/auth/profile
router.get('/profile', adminAuth, async (req, res) => {
  try {
    const adminDoc = await db.collection('admins').doc(req.adminId).get();
    if (!adminDoc.exists) return res.status(404).json({ message: 'Admin not found' });
    const admin = adminDoc.data();
    delete admin.password;
    res.json({ admin: { id: adminDoc.id, ...admin } });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/auth/logout
router.post('/logout', adminAuth, async (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
