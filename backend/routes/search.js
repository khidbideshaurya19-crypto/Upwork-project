const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Search users (clients for companies, companies for clients)
// Firestore doesn't support native regex, so we fetch by role and filter in memory.
router.get('/', auth, async (req, res) => {
  try {
    const {
      query,
      location,
      industry,
      skills,
      minRating,
      maxRating,
      minJobsCompleted,
      verified
    } = req.query;
    const currentUser = req.user;

    const hasAnyFilter = [query, location, industry, skills, minRating, maxRating, minJobsCompleted, verified]
      .some(v => v !== undefined && String(v).trim() !== '');
    if (!hasAnyFilter) return res.json({ users: [] });

    const q = (query || '').toLowerCase();

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

    const minRatingN = Number(minRating || 0);
    const maxRatingN = Number(maxRating || 0);
    const minJobsN = Number(minJobsCompleted || 0);
    const wantedSkills = String(skills || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const matched = allUsers.filter(u => {
      if (q) {
      const fields = [
        u.name,
        u.email,
        u.location,
        u.industry,
        u.companyName,
        ...(u.skills || [])
      ];
      const textMatch = fields.some(f => f && f.toLowerCase().includes(q));
      if (!textMatch) return false;
      }

      if (location && !(u.location || '').toLowerCase().includes(String(location).toLowerCase())) return false;
      if (industry && !(u.industry || '').toLowerCase().includes(String(industry).toLowerCase())) return false;

      if (wantedSkills.length > 0) {
        const userSkills = Array.isArray(u.skills) ? u.skills.map(s => String(s).toLowerCase()) : [];
        const hasSkills = wantedSkills.every(w => userSkills.some(us => us.includes(w)));
        if (!hasSkills) return false;
      }

      if (!Number.isNaN(minRatingN) && minRatingN > 0 && (u.rating || 0) < minRatingN) return false;
      if (!Number.isNaN(maxRatingN) && maxRatingN > 0 && (u.rating || 0) > maxRatingN) return false;
      if (!Number.isNaN(minJobsN) && minJobsN > 0 && (u.jobsCompleted || 0) < minJobsN) return false;

      if (verified !== undefined && verified !== '') {
        const mustBeVerified = String(verified) === 'true';
        if (!!u.verified !== mustBeVerified) return false;
      }

      return true;
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