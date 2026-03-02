const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Build a safe user object without password / internal fields
function publicUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyName: user.companyName,
    description: user.description,
    location: user.location,
    rating: user.rating,
    jobsPosted: user.jobsPosted,
    jobsCompleted: user.jobsCompleted,
    verified: user.verified,
    profileImage: user.profileImage,
    phone: user.phone,
    website: user.website,
    bio: user.bio,
    skills: user.skills,
    socialLinks: user.socialLinks,
    industry: user.industry,
    companySize: user.companySize,
    foundedYear: user.foundedYear,
    createdAt: user.createdAt,
    // Company verification fields
    verificationStatus: user.verificationStatus,
    verificationTier: user.verificationTier,
    domainVerified: user.domainVerified,
    websiteUrl: user.websiteUrl,
    linkedinUrl: user.linkedinUrl,
    adminApproved: user.adminApproved,
    adminRejectionReason: user.adminRejectionReason,
    isActive: user.isActive
  };
}

// ---- Tier 1 Auto-Verification Helpers ----
function isBusinessDomain(email) {
  const freeDomains = [
    'gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com',
    'icloud.com','mail.com','protonmail.com','zoho.com','yandex.com',
    'gmx.com','live.com','msn.com','inbox.com','fastmail.com',
    'tutanota.com','pm.me','hey.com','me.com','mac.com'
  ];
  const domain = email.split('@')[1]?.toLowerCase();
  return domain && !freeDomains.includes(domain);
}

function isValidUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.');
  } catch { return false; }
}

function isLinkedInUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace('www.', '').startsWith('linkedin.com');
  } catch { return false; }
}

function runTier1Checks(email, websiteUrl, linkedinUrl) {
  const checks = {
    domainVerified: isBusinessDomain(email),
    websiteValid: isValidUrl(websiteUrl),
    linkedinValid: isLinkedInUrl(linkedinUrl)
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, passed, total: 3 };
}

// Validation middleware
const validateSignup = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['client', 'company']).withMessage('Role must be either client or company')
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').isIn(['client', 'company']).withMessage('Role must be either client or company')
];

// @route   POST /api/auth/signup
// @desc    Register a new user (client or company)
// @access  Public
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, companyName, description, location, websiteUrl, linkedinUrl } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Build user data
    const userData = {
      name,
      email,
      password,
      role,
      companyName: role === 'company' ? companyName : undefined,
      description: role === 'company' ? description : undefined,
      location,
      isActive: true
    };

    // --- Company Tier 1 Auto-Verification ---
    if (role === 'company') {
      const tier1 = runTier1Checks(email, websiteUrl, linkedinUrl);
      userData.websiteUrl = websiteUrl || '';
      userData.linkedinUrl = linkedinUrl || '';
      userData.domainVerified = tier1.checks.domainVerified;
      userData.verificationTier = {
        domainEmail: tier1.checks.domainVerified,
        websiteCheck: tier1.checks.websiteValid,
        linkedinPresence: tier1.checks.linkedinValid,
        passed: tier1.passed,
        total: tier1.total
      };
      // Company starts as pending — admin must approve
      userData.verificationStatus = 'pending';
      userData.adminApproved = false;
    } else {
      // Clients are auto-approved
      userData.verificationStatus = 'approved';
      userData.adminApproved = true;
    }

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const responseMsg = role === 'company'
      ? 'Company registered! Your account is pending admin approval.'
      : 'User registered successfully';

    res.status(201).json({
      message: responseMsg,
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if role matches
    if (user.role !== role) {
      return res.status(401).json({ message: `This email is not registered as a ${role}` });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Block companies whose account is still pending or rejected
    if (user.role === 'company' && user.verificationStatus && user.verificationStatus !== 'approved') {
      const statusMsg = user.verificationStatus === 'rejected'
        ? `Your company account has been rejected. Reason: ${user.adminRejectionReason || 'Not specified'}`
        : 'Your company account is pending admin approval. Please wait for verification.';
      return res.status(403).json({ message: statusMsg, verificationStatus: user.verificationStatus });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
