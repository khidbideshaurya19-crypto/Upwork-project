const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { adminAuth } = require('../middleware/adminAuth');

// POST /api/admin/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
    if (!admin.isActive) return res.status(403).json({ message: 'Admin account is inactive' });

    const isValid = await admin.comparePassword(password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { adminId: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id, name: admin.name, email: admin.email,
        role: admin.role, permissions: admin.permissions
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
    const admin = await Admin.findById(req.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    const { password, _isNew, _passwordChanged, ...safeAdmin } = admin;
    res.json({ admin: safeAdmin });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/auth/logout
router.post('/logout', adminAuth, async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({ message: 'Admin account is inactive' });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Create JWT token
    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
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

// @route   GET /api/admin/profile
// @desc    Get admin profile
// @access  Private (Admin)
router.get('/profile', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ admin });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/logout
// @desc    Admin logout
// @access  Private (Admin)
router.post('/logout', adminAuth, async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
