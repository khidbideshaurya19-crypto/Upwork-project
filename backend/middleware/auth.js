const jwt = require('jsonwebtoken');
const { db } = require('../firebase');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userDoc = await db.collection('users').doc(decoded.userId).get();

    if (!userDoc.exists) {
      return res.status(401).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    delete userData.password;

    req.user = { id: userDoc.id, ...userData };
    req.userId = userDoc.id;
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
  next();
};

module.exports = { auth, isClient, isCompany };

