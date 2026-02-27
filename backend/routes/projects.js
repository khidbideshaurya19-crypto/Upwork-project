const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { db } = require('../firebase');
const { auth, isClient } = require('../middleware/auth');

const validateProject = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('budget').isNumeric().withMessage('Budget must be a number'),
  body('budgetType').isIn(['fixed', 'hourly']).withMessage('Budget type must be fixed or hourly')
];

// Helper: get user data (no password)
const getUser = async (id) => {
  if (!id) return null;
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  delete data.password;
  return { id: doc.id, ...data };
};

// POST /api/projects
router.post('/', [auth, isClient, validateProject], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, category, budget, budgetType, duration, skills } = req.body;
    const now = new Date();

    const projectData = {
      title, description, category,
      budget: Number(budget), budgetType,
      duration: duration || '',
      skills: Array.isArray(skills) ? skills : [],
      status: 'open',
      client: req.userId,
      applicantsCount: 0,
      assignedTo: null,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection('projects').add(projectData);
    const client = await getUser(req.userId);
    const project = { id: docRef.id, ...projectData, client };

    const io = req.app.get('io');
    if (io) io.emit('newProject', project);

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error while creating project' });
  }
});

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const { status, category, minBudget, maxBudget, search } = req.query;

    let query = db.collection('projects');
    query = query.where('status', '==', status || 'open');
    if (category) query = query.where('category', '==', category);

    const snap = await query.orderBy('createdAt', 'desc').limit(50).get();
    let projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side filters (Firestore limitations)
    if (minBudget) projects = projects.filter(p => p.budget >= Number(minBudget));
    if (maxBudget) projects = projects.filter(p => p.budget <= Number(maxBudget));
    if (search) {
      const s = search.toLowerCase();
      projects = projects.filter(p =>
        p.title?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s)
      );
    }

    // Populate client data
    const clientIds = [...new Set(projects.map(p => p.client).filter(Boolean))];
    const clientMap = {};
    await Promise.all(clientIds.map(async (id) => {
      clientMap[id] = await getUser(id);
    }));
    projects = projects.map(p => ({ ...p, client: clientMap[p.client] || p.client }));

    res.json({ projects, count: projects.length });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

// GET /api/projects/my-projects
router.get('/my-projects', [auth, isClient], async (req, res) => {
  try {
    const snap = await db.collection('projects')
      .where('client', '==', req.userId)
      .orderBy('createdAt', 'desc')
      .get();

    let projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Populate assignedTo
    await Promise.all(projects.map(async (p, i) => {
      if (p.assignedTo) projects[i].assignedTo = await getUser(p.assignedTo);
    }));

    res.json({ projects, count: projects.length });
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'Project not found' });

    const project = { id: doc.id, ...doc.data() };
    project.client = await getUser(project.client);
    if (project.assignedTo) project.assignedTo = await getUser(project.assignedTo);

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error while fetching project' });
  }
});

// PUT /api/projects/:id
router.put('/:id', [auth, isClient], async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'Project not found' });

    const project = doc.data();
    if (project.client !== req.userId) return res.status(403).json({ message: 'Not authorized to update this project' });

    const { title, description, category, budget, budgetType, duration, skills, status } = req.body;
    const updates = { updatedAt: new Date() };

    if (title) updates.title = title;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (budget) updates.budget = Number(budget);
    if (budgetType) updates.budgetType = budgetType;
    if (duration) updates.duration = duration;
    if (skills) updates.skills = skills;
    if (status) updates.status = status;

    await db.collection('projects').doc(req.params.id).update(updates);
    const updated = { id: req.params.id, ...project, ...updates };
    updated.client = await getUser(updated.client);

    res.json({ message: 'Project updated successfully', project: updated });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error while updating project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', [auth, isClient], async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'Project not found' });

    if (doc.data().client !== req.userId) return res.status(403).json({ message: 'Not authorized to delete this project' });

    await db.collection('projects').doc(req.params.id).delete();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error while deleting project' });
  }
});

module.exports = router;
