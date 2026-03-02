const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authorization required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.adminId;
    req.adminRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const Admin = require('../models/Admin');
      const admin = await Admin.findById(req.adminId);

      if (!admin) {
        return res.status(401).json({ message: 'Admin not found' });
      }

      // Super admin has all permissions
      if (admin.role === 'super_admin') {
        return next();
      }

      // Check specific permission
      if (!admin.permissions || !admin.permissions[permissionKey]) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = { adminAuth, checkPermission };
