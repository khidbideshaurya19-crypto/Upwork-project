const express = require('express');
const router = express.Router();
const { adminAuth, checkPermission } = require('../middleware/adminAuth');
const User = require('../models/User');
const Project = require('../models/Project');
const Application = require('../models/Application');
const Message = require('../models/Message');

// @route   GET /api/admin/dashboard
// @desc    Get dashboard analytics
// @access  Private (Admin)
router.get('/dashboard', adminAuth, checkPermission('viewAnalytics'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalCompanies = await User.countDocuments({ role: 'company' });
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: 'open' });
    const totalApplications = await Application.countDocuments();
    const totalMessages = await Message.countDocuments();

    // Get recent users
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select('-password');

    // Get recent projects
    const recentProjects = await Project.find().sort({ createdAt: -1 }).limit(10);

    // Get platform stats
    const stats = {
      users: {
        total: totalUsers,
        clients: totalClients,
        companies: totalCompanies
      },
      projects: {
        total: totalProjects,
        active: activeProjects
      },
      applications: totalApplications,
      messages: totalMessages,
      recentUsers,
      recentProjects
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private (Admin)
router.get('/users', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @route   GET /api/admin/users/:userId
// @desc    Get user details
// @access  Private (Admin)
router.get('/users/:userId', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's projects and applications
    const projects = await Project.find({ postedBy: user._id });
    const applications = await Application.find({ appliedBy: user._id });

    res.json({
      user,
      stats: {
        projects: projects.length,
        applications: applications.length
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:userId/status
// @desc    Block/Unblock user
// @access  Private (Admin)
router.put('/users/:userId/status', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const { isActive, reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        isActive,
        blockedReason: isActive ? '' : reason,
        blockedAt: isActive ? null : new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: isActive ? 'User unblocked' : 'User blocked',
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete user
// @access  Private (Admin)
router.delete('/users/:userId', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's projects
    await Project.deleteMany({ postedBy: user._id });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/projects
// @desc    Get all projects
// @access  Private (Admin)
router.get('/projects', adminAuth, checkPermission('manageProjects'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('postedBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      projects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// @route   PUT /api/admin/projects/:projectId/status
// @desc    Update project status (approve/reject/remove)
// @access  Private (Admin)
router.put('/projects/:projectId/status', adminAuth, checkPermission('manageProjects'), async (req, res) => {
  try {
    const { status, reason } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      {
        status,
        adminNotes: reason
      },
      { new: true }
    ).populate('postedBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      message: `Project status updated to ${status}`,
      project
    });
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/projects/:projectId
// @desc    Delete project
// @access  Private (Admin)
router.delete('/projects/:projectId', adminAuth, checkPermission('manageProjects'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Delete related applications
    await Application.deleteMany({ projectId: project._id });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/reports
// @desc    Get platform reports and statistics
// @access  Private (Admin)
router.get('/reports', adminAuth, checkPermission('viewAnalytics'), async (req, res) => {
  try {
    // User growth
    const usersPerDay = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Projects per day
    const projectsPerDay = await Project.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Top categories
    const topCategories = await Project.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      usersPerDay,
      projectsPerDay,
      topCategories
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error fetching reports' });
  }
});

module.exports = router;
