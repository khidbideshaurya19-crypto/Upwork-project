const express = require('express');
const router = express.Router();
const { adminAuth, checkPermission } = require('../middleware/adminAuth');
const User = require('../models/User');
const Project = require('../models/Project');
const Application = require('../models/Application');
const Message = require('../models/Message');

// ---- Utils ----
function toDate(v) {
  if (!v) return null;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

function safeUser(u) {
  if (!u) return null;
  const { password, _isNew, _passwordChanged, ...safe } = u;
  return safe;
}

function safeProject(p) {
  if (!p) return null;
  const { _isNew, ...safe } = p;
  return safe;
}

// GET /api/admin/dashboard
router.get('/dashboard', adminAuth, checkPermission('viewAnalytics'), async (req, res) => {
  try {
    const [allUsers, allProjects, totalApplications, totalMessages] = await Promise.all([
      User.find({}),
      Project.find({}),
      Application.countDocuments(),
      Message.countDocuments()
    ]);

    const totalUsers = allUsers.length;
    const totalClients = allUsers.filter(u => u.role === 'client').length;
    const totalCompanies = allUsers.filter(u => u.role === 'company').length;
    const pendingCompanies = allUsers.filter(u => u.role === 'company' && u.verificationStatus === 'pending').length;
    const totalProjects = allProjects.length;
    const activeProjects = allProjects.filter(p => p.status === 'open').length;

    const recentUsers = [...allUsers]
      .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt))
      .slice(0, 10)
      .map(u => safeUser(u));

    const recentProjects = [...allProjects]
      .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt))
      .slice(0, 10)
      .map(p => safeProject(p));

    res.json({
      users: { total: totalUsers, clients: totalClients, companies: totalCompanies },
      projects: { total: totalProjects, active: activeProjects },
      pendingCompanies,
      applications: totalApplications,
      messages: totalMessages,
      recentUsers,
      recentProjects
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// GET /api/admin/users
router.get('/users', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const pageN = parseInt(page), limitN = parseInt(limit);

    let allUsers = await User.find(role ? { role } : {});

    if (search) {
      const q = search.toLowerCase();
      allUsers = allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    allUsers.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
    const total = allUsers.length;
    const users = allUsers.slice((pageN - 1) * limitN, pageN * limitN).map(u => safeUser(u));

    res.json({
      users,
      pagination: { total, page: pageN, limit: limitN, pages: Math.ceil(total / limitN) }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// GET /api/admin/users/:userId
router.get('/users/:userId', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [projects, applications] = await Promise.all([
      Project.find({ client: user._id }),
      Application.find({ company: user._id })
    ]);

    res.json({
      user: safeUser(user),
      stats: { projects: projects.length, applications: applications.length }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:userId/status
router.put('/users/:userId/status', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const { isActive, reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = isActive;
    user.blockedReason = isActive ? '' : (reason || '');
    user.blockedAt = isActive ? null : new Date();
    await user.save();

    res.json({ message: isActive ? 'User unblocked' : 'User blocked', user: safeUser(user) });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete user's projects
    await Project.deleteMany({ client: user._id });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/projects
router.get('/projects', adminAuth, checkPermission('manageProjects'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const pageN = parseInt(page), limitN = parseInt(limit);

    let allProjects = await Project.find(status ? { status } : {});

    if (search) {
      const q = search.toLowerCase();
      allProjects = allProjects.filter(p => p.title && p.title.toLowerCase().includes(q));
    }

    allProjects.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
    const total = allProjects.length;
    const slice = allProjects.slice((pageN - 1) * limitN, pageN * limitN);

    // Populate client info
    const projects = await Promise.all(slice.map(async p => {
      const client = p.client ? await User.findById(p.client) : null;
      return {
        ...safeProject(p),
        clientData: client ? { _id: client._id, name: client.name, email: client.email } : null
      };
    }));

    res.json({
      projects,
      pagination: { total, page: pageN, limit: limitN, pages: Math.ceil(total / limitN) }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// PUT /api/admin/projects/:projectId/status
router.put('/projects/:projectId/status', adminAuth, checkPermission('manageProjects'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { status, adminNotes: reason },
      { new: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: `Project status updated to ${status}`, project: safeProject(project) });
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/projects/:projectId
router.delete('/projects/:projectId', adminAuth, checkPermission('manageProjects'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await Application.deleteMany({ project: project._id });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== COMPANY VERIFICATION ==============

// GET /api/admin/companies/pending  — list companies awaiting approval
router.get('/companies/pending', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const allCompanies = await User.find({ role: 'company' });
    // Filter by verificationStatus in-memory (Firestore doesn't support complex compound queries easily)
    const pending = allCompanies
      .filter(c => c.verificationStatus === 'pending')
      .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt))
      .map(c => safeUser(c));

    res.json({ companies: pending, total: pending.length });
  } catch (error) {
    console.error('Pending companies error:', error);
    res.status(500).json({ message: 'Server error fetching pending companies' });
  }
});

// GET /api/admin/companies/all  — list all companies with verification info
router.get('/companies/all', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const { status } = req.query; // 'pending', 'approved', 'rejected'
    const allCompanies = await User.find({ role: 'company' });
    let filtered = allCompanies;
    if (status) {
      filtered = allCompanies.filter(c => c.verificationStatus === status);
    }
    filtered.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
    res.json({ companies: filtered.map(c => safeUser(c)), total: filtered.length });
  } catch (error) {
    console.error('All companies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/companies/:companyId/approve  — approve a company
router.put('/companies/:companyId/approve', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const company = await User.findById(req.params.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (company.role !== 'company') return res.status(400).json({ message: 'User is not a company' });

    company.verificationStatus = 'approved';
    company.adminApproved = true;
    company.adminApprovedAt = new Date();
    company.adminApprovedBy = req.admin?._id || 'admin';
    company.adminRejectionReason = '';
    await company.save();

    res.json({ message: 'Company approved successfully', company: safeUser(company) });
  } catch (error) {
    console.error('Approve company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/companies/:companyId/reject  — reject a company
router.put('/companies/:companyId/reject', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const { reason } = req.body;
    const company = await User.findById(req.params.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (company.role !== 'company') return res.status(400).json({ message: 'User is not a company' });

    company.verificationStatus = 'rejected';
    company.adminApproved = false;
    company.adminRejectionReason = reason || 'Your application did not meet our verification requirements.';
    await company.save();

    res.json({ message: 'Company rejected', company: safeUser(company) });
  } catch (error) {
    console.error('Reject company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== END COMPANY VERIFICATION ==============

// GET /api/admin/reports
router.get('/reports', adminAuth, checkPermission('viewAnalytics'), async (req, res) => {
  try {
    const [allUsers, allProjects] = await Promise.all([User.find({}), Project.find({})]);

    // Group users by day (last 30 days)
    const usersByDay = {};
    allUsers.forEach(u => {
      const d = toDate(u.createdAt);
      if (d) {
        const key = d.toISOString().slice(0, 10);
        usersByDay[key] = (usersByDay[key] || 0) + 1;
      }
    });
    const usersPerDay = Object.entries(usersByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([_id, count]) => ({ _id, count }));

    // Group projects by day
    const projectsByDay = {};
    allProjects.forEach(p => {
      const d = toDate(p.createdAt);
      if (d) {
        const key = d.toISOString().slice(0, 10);
        projectsByDay[key] = (projectsByDay[key] || 0) + 1;
      }
    });
    const projectsPerDay = Object.entries(projectsByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([_id, count]) => ({ _id, count }));

    // Top categories
    const catCounts = {};
    allProjects.forEach(p => { if (p.category) catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
    const topCategories = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([_id, count]) => ({ _id, count }));

    res.json({ usersPerDay, projectsPerDay, topCategories });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error fetching reports' });
  }
});

module.exports = router;


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
