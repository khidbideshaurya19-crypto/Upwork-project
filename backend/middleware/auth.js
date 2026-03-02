const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // findById now returns a Firestore-backed User instance
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const isClient = (req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ message: 'Access denied. Client only.' });
  }
  next();
};

const isCompany = (req, res, next) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ message: 'Access denied. Company only.' });
  }
  // Block companies that haven't been approved by admin
  if (req.user.verificationStatus && req.user.verificationStatus !== 'approved') {
    return res.status(403).json({
      message: 'Your company account is pending admin approval.',
      verificationStatus: req.user.verificationStatus
    });
  }
  next();
};

module.exports = { auth, isClient, isCompany };
