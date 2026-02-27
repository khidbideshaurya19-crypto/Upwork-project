const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { adminAuth, checkPermission } = require('../middleware/adminAuth');

// GET /api/admin/dashboard
router.get('/dashboard', adminAuth, checkPermission('viewAnalytics'), async (req, res) => {
  try {
    const [usersSnap, projectsSnap, appsSnap, msgsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('projects').get(),
      db.collection('applications').get(),
      db.collection('messages').get()
    ]);

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const recentUsers = users.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10).map(u => { const c = {...u}; delete c.password; return c; });
    const recentProjects = projects.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10);

    res.json({
      users: { total: users.length, clients: users.filter(u => u.role === 'client').length, companies: users.filter(u => u.role === 'company').length },
      projects: { total: projects.length, active: projects.filter(p => p.status === 'open').length },
      applications: appsSnap.size,
      messages: msgsSnap.size,
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
    const snap = await db.collection('users').get();
    let users = snap.docs.map(d => { const data = d.data(); delete data.password; return { id: d.id, ...data }; });

    if (role) users = users.filter(u => u.role === role);
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u => u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
    }

    users.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const total = users.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paged = users.slice(start, start + parseInt(limit));

    res.json({ users: paged, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// GET /api/admin/users/:userId
router.get('/users/:userId', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    const userData = userDoc.data(); delete userData.password;
    const user = { id: userDoc.id, ...userData };

    const [projSnap, appSnap] = await Promise.all([
      db.collection('projects').where('client', '==', req.params.userId).get(),
      db.collection('applications').where('company', '==', req.params.userId).get()
    ]);

    res.json({ user, stats: { projects: projSnap.size, applications: appSnap.size } });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:userId/status
router.put('/users/:userId/status', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const { isActive, reason } = req.body;
    const updates = { isActive, blockedReason: isActive ? '' : (reason || ''), blockedAt: isActive ? null : new Date(), updatedAt: new Date() };
    await db.collection('users').doc(req.params.userId).update(updates);

    const userDoc = await db.collection('users').doc(req.params.userId).get();
    const userData = userDoc.data(); delete userData.password;
    res.json({ message: isActive ? 'User unblocked' : 'User blocked', user: { id: userDoc.id, ...userData } });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', adminAuth, checkPermission('manageUsers'), async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });

    const projSnap = await db.collection('projects').where('client', '==', req.params.userId).get();
    const batch = db.batch();
    projSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('users').doc(req.params.userId));
    await batch.commit();

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
    const snap = await db.collection('projects').get();
    let projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (status) projects = projects.filter(p => p.status === status);
    if (search) { const s = search.toLowerCase(); projects = projects.filter(p => p.title?.toLowerCase().includes(s)); }

    projects.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const total = projects.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paged = projects.slice(start, start + parseInt(limit));

    res.json({ projects: paged, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// PUT /api/admin/projects/:projectId/status
router.put('/projects/:projectId/status', adminAuth, checkPermission('manageProjects'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    await db.collection('projects').doc(req.params.projectId).update({ status, adminNotes: reason || '', updatedAt: new Date() });
    const doc = await db.collection('projects').doc(req.params.projectId).get();
    res.json({ message: `Project status updated to ${status}`, project: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/projects/:projectId
router.delete('/projects/:projectId', adminAuth, checkPermission('manageProjects'), async (req, res) => {
  try {
    const appsSnap = await db.collection('applications').where('project', '==', req.params.projectId).get();
    const batch = db.batch();
    appsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('projects').doc(req.params.projectId));
    await batch.commit();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/reports
router.get('/reports', adminAuth, checkPermission('viewAnalytics'), async (req, res) => {
  try {
    const [usersSnap, projectsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('projects').get()
    ]);

    const users = usersSnap.docs.map(d => d.data());
    const projects = projectsSnap.docs.map(d => d.data());

    const dateKey = (ts) => {
      if (!ts) return 'unknown';
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toISOString().split('T')[0];
    };

    const countByDate = (arr) => {
      const map = {};
      arr.forEach(item => { const k = dateKey(item.createdAt); map[k] = (map[k] || 0) + 1; });
      return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0])).slice(-30).map(([_id, count]) => ({ _id, count }));
    };

    const categoryMap = {};
    projects.forEach(p => { if (p.category) categoryMap[p.category] = (categoryMap[p.category] || 0) + 1; });
    const topCategories = Object.entries(categoryMap).sort((a,b) => b[1]-a[1]).slice(0,10).map(([_id, count]) => ({ _id, count }));

    res.json({ usersPerDay: countByDate(users), projectsPerDay: countByDate(projects), topCategories });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error fetching reports' });
  }
});

module.exports = router;
