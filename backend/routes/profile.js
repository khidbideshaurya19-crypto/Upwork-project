const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Helper – public safe user object (no password, no internals)
function publicUser(u) {
  if (!u) return null;
  const { password, _isNew, _passwordChanged, ...safe } = u;
  return safe;
}

// @route   GET /api/profile
// @desc    Get current user profile
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   GET /api/profile/:userId
// @desc    Get user profile by ID (public view)
// @access  Public
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
});

// @route   PUT /api/profile
// @desc    Update current user profile
// @access  Private
router.put('/', [auth, upload.single('profileImage')], async (req, res) => {
  try {
    const {
      name,
      companyName,
      description,
      location,
      phone,
      website,
      bio,
      industry,
      companySize,
      foundedYear,
      linkedin,
      twitter,
      github,
      skills
    } = req.body;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic fields
    if (name) user.name = name;
    if (location) user.location = location;
    if (phone) user.phone = phone;
    if (website) user.website = website;
    if (bio) user.bio = bio;
    if (industry) user.industry = industry;

    // Update role-specific fields
    if (user.role === 'company') {
      if (companyName) user.companyName = companyName;
      if (description) user.description = description;
      if (companySize) user.companySize = companySize;
      if (foundedYear) user.foundedYear = foundedYear;
    }

    // Update skills (parse if string)
    if (skills) {
      user.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
    }

    // Update social links
    if (linkedin || twitter || github) {
      user.socialLinks = {
        linkedin: linkedin || user.socialLinks?.linkedin || '',
        twitter: twitter || user.socialLinks?.twitter || '',
        github: github || user.socialLinks?.github || ''
      };
    }

    // Update profile image if uploaded
    if (req.file) {
      user.profileImage = `/uploads/${req.file.filename}`;
    }

    await user.save();

    const updatedUser = await User.findById(req.userId);
    res.json({ message: 'Profile updated successfully', user: publicUser(updatedUser) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// @route   PUT /api/profile/password
// @desc    Change password
// @access  Private
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password — mark as changed so save() re-hashes it
    user._passwordChanged = true;
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error while changing password' });
  }
});

module.exports = router;
