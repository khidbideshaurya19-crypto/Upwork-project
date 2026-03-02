const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Search users (clients for companies, companies for clients)
// Firestore doesn't support native regex, so we fetch by role and filter in memory.
router.get('/', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const currentUser = req.user;

    if (!query || query.trim() === '') {
      return res.json({ users: [] });
    }

    const q = query.toLowerCase();

    // Determine what role to search for
    let searchRole;
    if (currentUser.role === 'client') {
      searchRole = 'company';
    } else if (currentUser.role === 'company') {
      searchRole = 'client';
    } else {
      return res.status(400).json({ message: 'Invalid user role' });
    }

    // Fetch all users of the target role and filter in memory
    const allUsers = await User.find({ role: searchRole });

    const matched = allUsers.filter(u => {
      const fields = [
        u.name,
        u.email,
        u.location,
        u.industry,
        u.companyName,
        ...(u.skills || [])
      ];
      return fields.some(f => f && f.toLowerCase().includes(q));
    }).slice(0, 20);

    // Return without passwords
    const users = matched.map(u => {
      const { password, _isNew, _passwordChanged, ...safe } = u;
      return safe;
    });

    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID (public profile view)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, _isNew, _passwordChanged, ...safe } = user;
    res.json({ user: safe });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;