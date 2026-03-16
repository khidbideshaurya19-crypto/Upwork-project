const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const { auth, isClient } = require('../middleware/auth');

// ---- Helpers ----
function toDate(val) {
  if (!val) return null;
  if (val && typeof val.toDate === 'function') return val.toDate();
  return new Date(val);
}

function projectToJSON(p) {
  const { _isNew, ...rest } = p;
  return { ...rest, _id: p._id, id: p._id };
}

async function populateProject(p, clientFields, assignedFields) {
  const [client, assignedTo] = await Promise.all([
    p.client ? User.findById(p.client) : Promise.resolve(null),
    p.assignedTo ? User.findById(p.assignedTo) : Promise.resolve(null)
  ]);
  return {
    ...projectToJSON(p),
    client: client ? {
      _id: client._id, id: client._id,
      name: client.name, email: client.email,
      location: client.location, verified: client.verified,
      rating: client.rating, jobsPosted: client.jobsPosted
    } : p.client,
    assignedTo: assignedTo ? {
      _id: assignedTo._id, id: assignedTo._id,
      name: assignedTo.name, companyName: assignedTo.companyName,
      email: assignedTo.email, rating: assignedTo.rating
    } : p.assignedTo
  };
}

// ---- Validation ----
const validateProject = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('budget').isNumeric().withMessage('Budget must be a number'),
  body('budgetType').isIn(['fixed', 'hourly']).withMessage('Budget type must be fixed or hourly')
];

// POST /api/projects  — Create a new project (Client only)
router.post('/', [auth, isClient, validateProject], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, category, budget, budgetType, duration, skills } = req.body;

    const project = new Project({
      title, description, category, budget, budgetType, duration,
      skills: Array.isArray(skills) ? skills : [],
      client: req.userId,
      status: 'open',
      applicantsCount: 0
    });
    await project.save();

    const populated = await populateProject(project);

    res.status(201).json({ message: 'Project created successfully', project: populated });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error while creating project' });
  }
});

// GET /api/projects  — Get all projects (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, category, minBudget, maxBudget, search } = req.query;

    // Firestore only supports equality filters natively;
    // apply budget/text filters in memory
    const fsQuery = {};
    if (status) fsQuery.status = status;
    else fsQuery.status = 'open';
    if (category) fsQuery.category = category;

    let allProjects = await Project.find(fsQuery);

    // In-memory filters
    if (minBudget) allProjects = allProjects.filter(p => p.budget >= Number(minBudget));
    if (maxBudget) allProjects = allProjects.filter(p => p.budget <= Number(maxBudget));
    if (search) {
      const q = search.toLowerCase();
      allProjects = allProjects.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt desc, limit 50
    allProjects.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
    const slice = allProjects.slice(0, 50);

    const projects = await Promise.all(slice.map(p => populateProject(p)));
    res.json({ projects, count: projects.length });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

// GET /api/projects/my-projects  — Client's own projects
router.get('/my-projects', [auth, isClient], async (req, res) => {
  try {
    let projects = await Project.find({ client: req.userId });
    projects.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
    const populated = await Promise.all(projects.map(p => populateProject(p)));
    res.json({ projects: populated, count: populated.length });
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const populated = await populateProject(project);
    res.json({ project: populated });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error while fetching project' });
  }
});

// PUT /api/projects/:id  — Update project (Client only, own projects)
router.put('/:id', [auth, isClient], async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.client.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    // Only allow editing fields when project is still open
    const { title, description, category, budget, budgetType, duration, skills, status } = req.body;

    if (project.status === 'open') {
      // Full edit allowed on open projects
      if (title) project.title = title;
      if (description) project.description = description;
      if (category) project.category = category;
      if (budget) project.budget = budget;
      if (budgetType) project.budgetType = budgetType;
      if (duration) project.duration = duration;
      if (skills) project.skills = skills;
    } else if (status !== 'closed') {
      // Non-open projects can only be closed, not field-edited
      return res.status(400).json({ message: 'Only open projects can be edited. You can still close this project.' });
    }

    // Status transitions the client is allowed to make
    if (status) {
      const allowed = {
        'open': ['closed'],
        'in-progress': ['closed'],
        'completed': [],
        'closed': []
      };
      const transitions = allowed[project.status] || [];
      if (status !== project.status) {
        if (!transitions.includes(status)) {
          return res.status(400).json({
            message: `Cannot change status from "${project.status}" to "${status}"`
          });
        }
        project.status = status;
      }
    }

    await project.save();
    const populated = await populateProject(project);
    res.json({ message: 'Project updated successfully', project: populated });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error while updating project' });
  }
});

// DELETE /api/projects/:id  — Delete project (Client only, own open/closed projects)
router.delete('/:id', [auth, isClient], async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.client.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    // Prevent deleting projects that are in-progress (active contract)
    if (project.status === 'in-progress') {
      return res.status(400).json({ message: 'Cannot delete a project that is in progress. Close it first.' });
    }

    const Application = require('../models/Application');
    await Application.deleteMany({ project: project._id });

    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error while deleting project' });
  }
});

module.exports = router;
