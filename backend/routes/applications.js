const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const Project = require('../models/Project');
const Conversation = require('../models/Conversation');
const { auth, isCompany, isClient } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Validation middleware
const validateApplication = [
  body('quotation').isNumeric().withMessage('Quotation must be a number'),
  body('coverLetter').trim().notEmpty().withMessage('Cover letter is required'),
  body('estimatedDuration').optional().trim()
];

// @route   POST /api/applications/:projectId
// @desc    Apply to a project (Company only)
// @access  Private
router.post('/:projectId', [auth, isCompany, upload.array('attachments', 5), validateApplication], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { quotation, coverLetter, estimatedDuration, portfolioLinks } = req.body;
    const projectId = req.params.projectId;

    // Check if project exists and is open
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.status !== 'open') {
      return res.status(400).json({ message: 'This project is no longer accepting applications' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      project: projectId,
      company: req.userId
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this project' });
    }

    // Process uploaded files
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    // Parse portfolio links
    let links = [];
    if (portfolioLinks) {
      try {
        links = typeof portfolioLinks === 'string' ? JSON.parse(portfolioLinks) : portfolioLinks;
      } catch (e) {
        links = [portfolioLinks];
      }
    }

    const application = new Application({
      project: projectId,
      company: req.userId,
      quotation,
      coverLetter,
      estimatedDuration,
      attachments,
      portfolioLinks: links
    });

    await application.save();
    await application.populate('company', 'name companyName email rating jobsCompleted verified location');

    let conversation = await Conversation.findOne({
      project: projectId,
      company: req.userId
    });

    if (!conversation) {
      conversation = new Conversation({
        project: projectId,
        application: application._id,
        client: project.client,
        company: req.userId
      });
      await conversation.save();
    }

    await conversation.populate('project client company');

    // Update project applicants count
    project.applicantsCount += 1;
    await project.save();

    // Emit socket event for real-time notification to client
    const io = req.app.get('io');
    if (io) {
      io.to(`client-${project.client.toString()}`).emit('newApplication', {
        projectId: project._id,
        projectTitle: project.title,
        application
      });

      io.to(`client-${project.client.toString()}`).emit('conversationStarted', {
        conversation
      });

      io.to(`company-${req.userId}`).emit('conversationStarted', {
        conversation
      });
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
      conversation
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Server error while submitting application' });
  }
});

// @route   GET /api/applications/project/:projectId
// @desc    Get all applications for a project (Client only - own projects)
// @access  Private
router.get('/project/:projectId', [auth, isClient], async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Verify the project belongs to the client
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.client.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view these applications' });
    }

    const applications = await Application.find({ project: projectId })
      .populate('company', 'name companyName email rating jobsCompleted verified location description')
      .sort({ createdAt: -1 });

    res.json({ applications, count: applications.length });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
});

// @route   GET /api/applications/my-applications
// @desc    Get all applications submitted by the company
// @access  Private (Company only)
router.get('/my-applications', [auth, isCompany], async (req, res) => {
  try {
    const applications = await Application.find({ company: req.userId })
      .populate('project', 'title description budget budgetType status')
      .populate({
        path: 'project',
        populate: {
          path: 'client',
          select: 'name email location verified rating'
        }
      })
      .sort({ createdAt: -1 });

    res.json({ applications, count: applications.length });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
});

// @route   GET /api/applications/:id
// @desc    Get single application details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('company', 'name companyName email rating jobsCompleted verified location description')
      .populate('project', 'title description budget budgetType client');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if user is authorized to view this application
    const isOwner = application.company._id.toString() === req.userId;
    const isProjectOwner = application.project.client.toString() === req.userId;

    if (!isOwner && !isProjectOwner) {
      return res.status(403).json({ message: 'Not authorized to view this application' });
    }

    res.json({ application });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Server error while fetching application' });
  }
});

// @route   PUT /api/applications/:id/status
// @desc    Update application status (Client only)
// @access  Private
router.put('/:id/status', [auth, isClient], async (req, res) => {
  try {
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const application = await Application.findById(req.params.id)
      .populate('project');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify the project belongs to the client
    if (application.project.client.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    application.status = status;
    await application.save();

    const io = req.app.get('io');

    // If accepted, update project status and assigned company
    if (status === 'accepted') {
      const project = await Project.findById(application.project._id);
      project.status = 'in-progress';
      project.assignedTo = application.company;
      await project.save();

      // Reject all other applications for this project
      await Application.updateMany(
        { 
          project: application.project._id, 
          _id: { $ne: application._id },
          status: 'pending'
        },
        { status: 'rejected' }
      );

      let conversation = await Conversation.findOne({
        project: application.project._id,
        company: application.company
      });

      if (!conversation) {
        conversation = new Conversation({
          project: application.project._id,
          application: application._id,
          client: application.project.client,
          company: application.company
        });
        await conversation.save();
      }

      await conversation.populate('project client company');

      // Notify both users that messaging is now available
      if (io) {
        io.to(`client-${application.project.client.toString()}`).emit('conversationStarted', {
          conversation
        });
        io.to(`company-${application.company.toString()}`).emit('conversationStarted', {
          conversation
        });
      }
    }

    // Emit socket event for real-time notification to company
    if (io) {
      io.to(`company-${application.company.toString()}`).emit('applicationStatusUpdate', {
        applicationId: application._id,
        status: application.status,
        projectTitle: application.project.title
      });
    }

    res.json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error while updating application' });
  }
});

// @route   DELETE /api/applications/:id
// @desc    Delete/withdraw an application (Company only - own applications)
// @access  Private
router.delete('/:id', [auth, isCompany], async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if the user owns this application
    if (application.company.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this application' });
    }

    // Only allow deletion if status is pending
    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot withdraw an application that has been processed' });
    }

    // Update project applicants count
    await Project.findByIdAndUpdate(application.project, {
      $inc: { applicantsCount: -1 }
    });

    await application.deleteOne();

    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'Server error while deleting application' });
  }
});

module.exports = router;
