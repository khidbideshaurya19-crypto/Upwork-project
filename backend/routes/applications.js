const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const Project = require('../models/Project');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { auth, isCompany, isClient } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ---- Helpers ----
function toDate(v) {
  if (!v) return null;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

function appToJSON(a) {
  const { _isNew, ...rest } = a;
  return { ...rest, _id: a._id, id: a._id };
}

async function populateApp(a) {
  const [company, project] = await Promise.all([
    a.company ? User.findById(a.company) : Promise.resolve(null),
    a.project ? Project.findById(a.project) : Promise.resolve(null)
  ]);
  let populatedClient = null;
  if (project && project.client) {
    populatedClient = await User.findById(project.client);
  }
  return {
    ...appToJSON(a),
    company: company ? {
      _id: company._id, name: company.name, companyName: company.companyName,
      email: company.email, rating: company.rating, jobsCompleted: company.jobsCompleted,
      verified: company.verified, location: company.location, description: company.description
    } : a.company,
    project: project ? {
      _id: project._id, title: project.title, description: project.description,
      budget: project.budget, budgetType: project.budgetType,
      status: project.status, client: project.client,
      clientData: populatedClient ? {
        _id: populatedClient._id, name: populatedClient.name,
        email: populatedClient.email, location: populatedClient.location,
        verified: populatedClient.verified, rating: populatedClient.rating
      } : null
    } : a.project
  };
}

// Validation
const validateApplication = [
  body('quotation').isNumeric().withMessage('Quotation must be a number'),
  body('coverLetter').trim().notEmpty().withMessage('Cover letter is required'),
  body('estimatedDuration').optional().trim()
];

// POST /api/applications/:projectId â€” Apply to a project (Company only)
router.post('/:projectId', [auth, isCompany, upload.array('attachments', 5), validateApplication], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { quotation, coverLetter, estimatedDuration, portfolioLinks } = req.body;
    const projectId = req.params.projectId;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.status !== 'open') return res.status(400).json({ message: 'This project is no longer accepting applications' });

    const existingApp = await Application.findOne({ project: projectId, company: req.userId });
    if (existingApp) return res.status(400).json({ message: 'You have already applied to this project' });

    const attachments = (req.files || []).map(f => ({
      filename: f.filename, originalName: f.originalname,
      path: f.path, mimetype: f.mimetype, size: f.size
    }));

    let links = [];
    if (portfolioLinks) {
      try { links = typeof portfolioLinks === 'string' ? JSON.parse(portfolioLinks) : portfolioLinks; }
      catch { links = [portfolioLinks]; }
    }

    const application = new Application({
      project: projectId, company: req.userId,
      quotation, coverLetter, estimatedDuration, attachments,
      portfolioLinks: links, status: 'pending'
    });
    await application.save();

    // Create/find conversation
    let conversation = await Conversation.findOne({ project: projectId, company: req.userId });
    if (!conversation) {
      conversation = new Conversation({
        project: projectId, application: application._id,
        client: project.client, company: req.userId,
        unreadCountClient: 0, unreadCountCompany: 0
      });
      await conversation.save();
    }

    // Update project applicants count
    project.applicantsCount = (project.applicantsCount || 0) + 1;
    await project.save();

    // Populate for response
    const populatedApp = await populateApp(application);
    const [clientUser, companyUser, projectDoc] = await Promise.all([
      User.findById(conversation.client),
      User.findById(conversation.company),
      Project.findById(conversation.project)
    ]);
    const populatedConv = {
      ...conversation.toJSON(), _id: conversation._id, id: conversation._id,
      client: clientUser ? { _id: clientUser._id, name: clientUser.name, email: clientUser.email, profileImage: clientUser.profileImage } : conversation.client,
      company: companyUser ? { _id: companyUser._id, name: companyUser.name, companyName: companyUser.companyName, email: companyUser.email, profileImage: companyUser.profileImage } : conversation.company,
      project: projectDoc ? { _id: projectDoc._id, title: projectDoc.title } : conversation.project
    };

    const io = req.app.get('io');
    if (io) {
      io.to(`client-${project.client}`).emit('newApplication', { projectId: project._id, projectTitle: project.title, application: populatedApp });
      io.to(`client-${project.client}`).emit('conversationStarted', { conversation: populatedConv });
      io.to(`company-${req.userId}`).emit('conversationStarted', { conversation: populatedConv });
    }

    res.status(201).json({ message: 'Application submitted successfully', application: populatedApp, conversation: populatedConv });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Server error while submitting application' });
  }
});

// GET /api/applications/project/:projectId â€” All applications for a project (Client only)
router.get('/project/:projectId', [auth, isClient], async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.client.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });

    let apps = await Application.find({ project: req.params.projectId });
    apps.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
    const applications = await Promise.all(apps.map(a => populateApp(a)));
    res.json({ applications, count: applications.length });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
});

// GET /api/applications/my-applications â€” Company's applications
router.get('/my-applications', [auth, isCompany], async (req, res) => {
  try {
    let apps = await Application.find({ company: req.userId });
    apps.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
    const applications = await Promise.all(apps.map(a => populateApp(a)));
    res.json({ applications, count: applications.length });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
});

// GET /api/applications/:id â€” Single application
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const project = await Project.findById(application.project);
    const isOwner = application.company.toString() === req.userId;
    const isProjectOwner = project && project.client.toString() === req.userId;
    if (!isOwner && !isProjectOwner) return res.status(403).json({ message: 'Not authorized' });

    const populated = await populateApp(application);
    res.json({ application: populated });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Server error while fetching application' });
  }
});

// PUT /api/applications/:id/status â€” Update status (Client only)
router.put('/:id/status', [auth, isClient], async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const project = await Project.findById(application.project);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.client.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });

    application.status = status;
    await application.save();

    const io = req.app.get('io');

    if (status === 'accepted') {
      project.status = 'in-progress';
      project.assignedTo = application.company;
      await project.save();

      // Reject other pending applications
      const otherApps = await Application.find({ project: application.project, status: 'pending' });
      for (const oa of otherApps) {
        if (oa._id.toString() !== application._id.toString()) {
          oa.status = 'rejected';
          await oa.save();
        }
      }

      // Find or create conversation
      let conversation = await Conversation.findOne({ project: application.project, company: application.company });
      if (!conversation) {
        conversation = new Conversation({
          project: application.project, application: application._id,
          client: project.client, company: application.company,
          unreadCountClient: 0, unreadCountCompany: 0
        });
        await conversation.save();
      }

      const [clientUser, companyUser, projectDoc] = await Promise.all([
        User.findById(conversation.client),
        User.findById(conversation.company),
        Promise.resolve(project)
      ]);
      const populatedConv = {
        ...conversation.toJSON(), _id: conversation._id, id: conversation._id,
        client: clientUser ? { _id: clientUser._id, name: clientUser.name, email: clientUser.email } : conversation.client,
        company: companyUser ? { _id: companyUser._id, name: companyUser.name, companyName: companyUser.companyName, email: companyUser.email } : conversation.company,
        project: { _id: projectDoc._id, title: projectDoc.title }
      };

      if (io) {
        io.to(`client-${project.client}`).emit('conversationStarted', { conversation: populatedConv });
        io.to(`company-${application.company}`).emit('conversationStarted', { conversation: populatedConv });
      }
    }

    if (io) {
      io.to(`company-${application.company}`).emit('applicationStatusUpdate', {
        applicationId: application._id, status: application.status,
        projectTitle: project.title
      });
    }

    const populated = await populateApp(application);
    res.json({ message: 'Application status updated successfully', application: populated });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error while updating application' });
  }
});

// DELETE /api/applications/:id â€” Withdraw application (Company only)
router.delete('/:id', [auth, isCompany], async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.company.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    if (application.status !== 'pending') return res.status(400).json({ message: 'Cannot withdraw a processed application' });

    // Decrement project applicants count
    const project = await Project.findById(application.project);
    if (project) {
      project.applicantsCount = Math.max(0, (project.applicantsCount || 1) - 1);
      await project.save();
    }

    await application.deleteOne();
    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'Server error while deleting application' });
  }
});

module.exports = router;
