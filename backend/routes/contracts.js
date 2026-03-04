const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Milestone = require('../models/Milestone');
const ProjectUpdate = require('../models/ProjectUpdate');
const Project = require('../models/Project');
const User = require('../models/User');
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Helpers ──
function safeDate(v) {
  if (!v) return null;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

async function populateContract(contract) {
  const [client, company, project] = await Promise.all([
    contract.clientId ? User.findById(contract.clientId) : null,
    contract.companyId ? User.findById(contract.companyId) : null,
    contract.projectId ? Project.findById(contract.projectId) : null
  ]);
  return {
    ...contract.toJSON(),
    client: client ? { _id: client._id, name: client.name, email: client.email, profileImage: client.profileImage } : null,
    company: company ? { _id: company._id, name: company.name, companyName: company.companyName, email: company.email, profileImage: company.profileImage } : null,
    project: project ? { _id: project._id, title: project.title, description: project.description, budget: project.budget, budgetType: project.budgetType, category: project.category, skills: project.skills } : null
  };
}

// ═══════════════════════════════════════
// GET /api/contracts — List my contracts
// ═══════════════════════════════════════
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    // Find contracts where user is client or company
    const [asClient, asCompany] = await Promise.all([
      Contract.find({ clientId: userId }),
      Contract.find({ companyId: userId })
    ]);
    const all = [...asClient, ...asCompany];
    // Deduplicate
    const seen = new Set();
    const unique = all.filter(c => { if (seen.has(c._id)) return false; seen.add(c._id); return true; });
    // Sort newest first
    unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const populated = await Promise.all(unique.map(c => populateContract(c)));
    res.json({ contracts: populated });
  } catch (err) {
    console.error('Get contracts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// GET /api/contracts/:id — Single contract detail
// ═══════════════════════════════════════
router.get('/:id', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    if (contract.clientId !== req.userId && contract.companyId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const populated = await populateContract(contract);
    res.json({ contract: populated });
  } catch (err) {
    console.error('Get contract error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// POST /api/contracts/:id/milestones — Add milestone (client or company)
// ═══════════════════════════════════════
router.post('/:id/milestones', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    if (contract.clientId !== req.userId && contract.companyId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, amount, dueDate } = req.body;
    if (!title) return res.status(400).json({ message: 'Milestone title is required' });

    // Get current count for ordering
    const existing = await Milestone.find({ contractId: contract._id });

    const milestone = new Milestone({
      contractId: contract._id,
      projectId: contract.projectId,
      title,
      description: description || '',
      amount: Number(amount) || 0,
      dueDate: dueDate || null,
      status: 'pending', // pending → in-progress → submitted → approved
      order: existing.length + 1,
      createdBy: req.userId
    });
    await milestone.save();

    res.status(201).json({ message: 'Milestone created', milestone: milestone.toJSON() });
  } catch (err) {
    console.error('Create milestone error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// GET /api/contracts/:id/milestones — List milestones
// ═══════════════════════════════════════
router.get('/:id/milestones', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    if (contract.clientId !== req.userId && contract.companyId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const milestones = await Milestone.find({ contractId: contract._id });
    milestones.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json({ milestones: milestones.map(m => m.toJSON()) });
  } catch (err) {
    console.error('Get milestones error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// PUT /api/contracts/:id/milestones/:milestoneId — Update milestone status
// Supports file uploads when submitting deliverables
// ═══════════════════════════════════════
router.put('/:id/milestones/:milestoneId', auth, upload.array('deliverables', 10), async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    if (contract.clientId !== req.userId && contract.companyId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone || milestone.contractId !== contract._id) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const { status, title, description, amount, dueDate, feedback } = req.body;

    // Build file attachment metadata from uploaded files
    const newFiles = (req.files || []).map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      url: `/uploads/${f.filename}`,
      uploadedAt: new Date().toISOString()
    }));

    // Company can: start work, submit for review
    if (contract.companyId === req.userId) {
      if (status === 'in-progress' && milestone.status === 'pending') {
        milestone.status = 'in-progress';
        milestone.startedAt = new Date();
      } else if (status === 'submitted' && (milestone.status === 'in-progress' || milestone.status === 'revision-requested')) {
        milestone.status = 'submitted';
        milestone.submittedAt = new Date();
        // Append deliverable files
        if (newFiles.length > 0) {
          milestone.attachments = [...(milestone.attachments || []), ...newFiles];
        }
      }
    }

    // Client can: approve, request revision
    if (contract.clientId === req.userId) {
      if (status === 'approved' && milestone.status === 'submitted') {
        milestone.status = 'approved';
        milestone.approvedAt = new Date();
      } else if (status === 'revision-requested' && milestone.status === 'submitted') {
        milestone.status = 'revision-requested';
        milestone.feedback = feedback || '';
      }
    }

    // Either party can edit title/description/amount/dueDate if still pending
    if (milestone.status === 'pending') {
      if (title) milestone.title = title;
      if (description !== undefined) milestone.description = description;
      if (amount !== undefined) milestone.amount = Number(amount);
      if (dueDate !== undefined) milestone.dueDate = dueDate;
    }

    await milestone.save();

    // Check if all milestones approved → complete project
    const allMilestones = await Milestone.find({ contractId: contract._id });
    const allApproved = allMilestones.length > 0 && allMilestones.every(m => m.status === 'approved');
    if (allApproved) {
      contract.status = 'completed';
      contract.completedAt = new Date();
      await contract.save();

      const project = await Project.findById(contract.projectId);
      if (project) {
        project.status = 'completed';
        await project.save();
      }
    }

    res.json({ message: 'Milestone updated', milestone: milestone.toJSON() });
  } catch (err) {
    console.error('Update milestone error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// DELETE /api/contracts/:id/milestones/:milestoneId — Delete milestone (pending only)
// ═══════════════════════════════════════
router.delete('/:id/milestones/:milestoneId', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    if (contract.clientId !== req.userId && contract.companyId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone || milestone.contractId !== contract._id) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    if (milestone.status !== 'pending') {
      return res.status(400).json({ message: 'Can only delete pending milestones' });
    }

    await milestone.deleteOne();
    res.json({ message: 'Milestone deleted' });
  } catch (err) {
    console.error('Delete milestone error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// POST /api/contracts/:id/updates — Post a progress update
// Supports file attachments (up to 10 files)
// ═══════════════════════════════════════
router.post('/:id/updates', auth, upload.array('attachments', 10), async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    if (contract.clientId !== req.userId && contract.companyId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { message, type } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: 'Message is required' });

    // Build file attachment metadata
    const files = (req.files || []).map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      url: `/uploads/${f.filename}`,
      uploadedAt: new Date().toISOString()
    }));

    const author = await User.findById(req.userId);

    const update = new ProjectUpdate({
      contractId: contract._id,
      projectId: contract.projectId,
      authorId: req.userId,
      authorName: author ? (author.companyName || author.name) : 'Unknown',
      authorRole: contract.companyId === req.userId ? 'company' : 'client',
      message: message.trim(),
      type: type || 'update',
      attachments: files
    });
    await update.save();

    res.status(201).json({ message: 'Update posted', update: update.toJSON() });
  } catch (err) {
    console.error('Post update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// GET /api/contracts/:id/updates — List updates (activity feed)
// ═══════════════════════════════════════
router.get('/:id/updates', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    if (contract.clientId !== req.userId && contract.companyId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updates = await ProjectUpdate.find({ contractId: contract._id });
    updates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ updates: updates.map(u => u.toJSON()) });
  } catch (err) {
    console.error('Get updates error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// PUT /api/contracts/:id/complete — Mark contract as completed
// ═══════════════════════════════════════
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    if (contract.clientId !== req.userId) {
      return res.status(403).json({ message: 'Only the client can mark as complete' });
    }
    if (contract.status === 'completed') {
      return res.status(400).json({ message: 'Already completed' });
    }

    contract.status = 'completed';
    contract.completedAt = new Date();
    await contract.save();

    const project = await Project.findById(contract.projectId);
    if (project) {
      project.status = 'completed';
      await project.save();
    }

    // Post system update
    const sysUpdate = new ProjectUpdate({
      contractId: contract._id,
      projectId: contract.projectId,
      authorId: req.userId,
      authorName: 'System',
      authorRole: 'system',
      message: 'Project has been marked as completed!',
      type: 'system'
    });
    await sysUpdate.save();

    res.json({ message: 'Contract completed', contract: contract.toJSON() });
  } catch (err) {
    console.error('Complete contract error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
