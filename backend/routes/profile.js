const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const bcrypt = require('bcryptjs');

// @route   GET /api/profile
router.get('/', auth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    const userData = userDoc.data();
    delete userData.password;
    res.json({ user: { id: userDoc.id, ...userData } });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   GET /api/profile/:userId
router.get('/:userId', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    const userData = userDoc.data();
    delete userData.password;
    res.json({ user: { id: userDoc.id, ...userData } });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
});

// @route   PUT /api/profile
router.put('/', [auth, upload.single('profileImage')], async (req, res) => {
  try {
    const {
      name, companyName, description, location, phone, website,
      bio, industry, companySize, foundedYear, linkedin, twitter, github, skills, specializations
    } = req.body;

    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    const user = userDoc.data();

    const updates = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (phone !== undefined) updates.phone = phone;
    if (website !== undefined) updates.website = website;
    if (bio !== undefined) updates.bio = bio;
    if (industry !== undefined) updates.industry = industry;

    if (user.role === 'company') {
      if (companyName) updates.companyName = companyName;
      if (description !== undefined) updates.description = description;
      if (companySize !== undefined) updates.companySize = companySize;
      if (foundedYear !== undefined) updates.foundedYear = foundedYear;
    }

    if (skills !== undefined) {
      updates.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
    }
    if (specializations !== undefined) {
      updates.specializations = typeof specializations === 'string' ? JSON.parse(specializations) : specializations;
    }

    if (linkedin !== undefined || twitter !== undefined || github !== undefined) {
      const existing = user.socialLinks || {};
      updates.socialLinks = {
        linkedin: linkedin !== undefined ? linkedin : (existing.linkedin || ''),
        twitter: twitter !== undefined ? twitter : (existing.twitter || ''),
        github: github !== undefined ? github : (existing.github || '')
      };
    }

    if (req.file) {
      updates.profileImage = `/uploads/${req.file.filename}`;
    }

    await db.collection('users').doc(req.userId).update(updates);

    const updatedDoc = await db.collection('users').doc(req.userId).get();
    const updatedData = updatedDoc.data();
    delete updatedData.password;

    res.json({ message: 'Profile updated successfully', user: { id: req.userId, ...updatedData } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// @route   PUT /api/profile/password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    const user = userDoc.data();

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('users').doc(req.userId).update({ password: hashedPassword, updatedAt: new Date() });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error while changing password' });
  }
});

module.exports = router;
