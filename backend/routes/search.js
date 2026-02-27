const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Search users (clients for companies, companies for clients)
router.get('/', auth, async (req, res) => {
  try {
    const { query, type } = req.query;
    const currentUser = req.user;

    if (!query || query.trim() === '') {
      return res.json({ users: [] });
    }

    // Determine what to search for based on current user's role
    let searchRole;
    if (currentUser.role === 'client') {
      // Clients search for companies
      searchRole = 'company';
    } else if (currentUser.role === 'company') {
      // Companies search for clients
      searchRole = 'client';
    } else {
      return res.status(400).json({ message: 'Invalid user role' });
    }

    // Build search query
    const searchQuery = {
      role: searchRole,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
        { industry: { $regex: query, $options: 'i' } },
        { skills: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    // If searching for companies, also search companyName
    if (searchRole === 'company') {
      searchQuery.$or.push({ companyName: { $regex: query, $options: 'i' } });
    }

    const users = await User.find(searchQuery)
      .select('-password')
      .limit(20);

    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID (public profile view)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
