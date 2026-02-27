const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { auth, isCompany, isClient } = require('../middleware/auth');
const upload = require('../middleware/upload');

const getUser = async (id) => {
  if (!id) return null;
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data(); delete data.password;
  return { id: doc.id, ...data };
};

// POST /api/applications/:projectId
router.post('/:projectId', [auth, isCompany, upload.array('attachments', 5)], async (req, res) => {
  try {
    const { quotation, coverLetter, estimatedDuration, portfolioLinks } = req.body;
    const projectId = req.params.projectId;

    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return res.status(404).json({ message: 'Project not found' });
    const project = projectDoc.data();
    if (project.status !== 'open') return res.status(400).json({ message: 'This project is no longer accepting applications' });

    const existingSnap = await db.collection('applications')
      .where('project', '==', projectId).where('company', '==', req.userId).limit(1).get();
    if (!existingSnap.empty) return res.status(400).json({ message: 'You have already applied to this project' });

    const attachments = req.files ? req.files.map(f => ({ filename: f.filename, originalName: f.originalname, path: f.path, mimetype: f.mimetype, size: f.size })) : [];
    let links = [];
    if (portfolioLinks) { try { links = typeof portfolioLinks === 'string' ? JSON.parse(portfolioLinks) : portfolioLinks; } catch(e) { links = [portfolioLinks]; } }

    const now = new Date();
    const appData = { project: projectId, company: req.userId, quotation: Number(quotation), coverLetter, estimatedDuration: estimatedDuration || '', attachments, portfolioLinks: links, status: 'pending', createdAt: now, updatedAt: now };
    const appRef = await db.collection('applications').add(appData);

    // Find or create conversation
    let convSnap = await db.collection('conversations').where('project', '==', projectId).where('company', '==', req.userId).limit(1).get();
    let conversation;
    if (convSnap.empty) {
      const convData = { project: projectId, application: appRef.id, client: project.client, company: req.userId, lastMessage: null, lastMessageTime: now, unreadCountClient: 0, unreadCountCompany: 0, createdAt: now, updatedAt: now };
      const convRef = await db.collection('conversations').add(convData);
      conversation = { id: convRef.id, ...convData };
    } else {
      const convDoc = convSnap.docs[0];
      conversation = { id: convDoc.id, ...convDoc.data() };
    }

    await db.collection('projects').doc(projectId).update({ applicantsCount: (project.applicantsCount || 0) + 1, updatedAt: now });

    const companyData = await getUser(req.userId);
    const application = { id: appRef.id, ...appData, company: companyData };

    const io = req.app.get('io');
    if (io) {
      io.to(`client-${project.client}`).emit('newApplication', { projectId, projectTitle: project.title, application });
      io.to(`client-${project.client}`).emit('conversationStarted', { conversation });
      io.to(`company-${req.userId}`).emit('conversationStarted', { conversation });
    }

    res.status(201).json({ message: 'Application submitted successfully', application, conversation });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Server error while submitting application' });
  }
});

// GET /api/applications/project/:projectId
router.get('/project/:projectId', [auth, isClient], async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return res.status(404).json({ message: 'Project not found' });
    if (projectDoc.data().client !== req.userId) return res.status(403).json({ message: 'Not authorized to view these applications' });

    const snap = await db.collection('applications').where('project', '==', projectId).orderBy('createdAt', 'desc').get();
    const applications = await Promise.all(snap.docs.map(async d => {
      const data = d.data();
      data.company = await getUser(data.company);
      return { id: d.id, ...data };
    }));

    res.json({ applications, count: applications.length });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
});

// GET /api/applications/my-applications
router.get('/my-applications', [auth, isCompany], async (req, res) => {
  try {
    const snap = await db.collection('applications').where('company', '==', req.userId).orderBy('createdAt', 'desc').get();
    const applications = await Promise.all(snap.docs.map(async d => {
      const data = d.data();
      const projectDoc = await db.collection('projects').doc(data.project).get();
      if (projectDoc.exists) {
        const proj = projectDoc.data();
        proj.client = await getUser(proj.client);
        data.project = { id: projectDoc.id, ...proj };
      }
      return { id: d.id, ...data };
    }));
    res.json({ applications, count: applications.length });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
});

// GET /api/applications/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const appDoc = await db.collection('applications').doc(req.params.id).get();
    if (!appDoc.exists) return res.status(404).json({ message: 'Application not found' });
    const data = appDoc.data();
    const projectDoc = await db.collection('projects').doc(data.project).get();
    const project = projectDoc.exists ? { id: projectDoc.id, ...projectDoc.data() } : null;
    const company = await getUser(data.company);
    const isOwner = data.company === req.userId;
    const isProjectOwner = project && project.client === req.userId;
    if (!isOwner && !isProjectOwner) return res.status(403).json({ message: 'Not authorized to view this application' });
    res.json({ application: { id: appDoc.id, ...data, company, project } });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Server error while fetching application' });
  }
});

// PUT /api/applications/:id/status
router.put('/:id/status', [auth, isClient], async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const appDoc = await db.collection('applications').doc(req.params.id).get();
    if (!appDoc.exists) return res.status(404).json({ message: 'Application not found' });
    const appData = appDoc.data();

    const projectDoc = await db.collection('projects').doc(appData.project).get();
    if (!projectDoc.exists) return res.status(404).json({ message: 'Project not found' });
    const project = projectDoc.data();

    if (project.client !== req.userId) return res.status(403).json({ message: 'Not authorized to update this application' });

    const now = new Date();
    await db.collection('applications').doc(req.params.id).update({ status, updatedAt: now });

    const io = req.app.get('io');

    if (status === 'accepted') {
      await db.collection('projects').doc(appData.project).update({ status: 'in-progress', assignedTo: appData.company, updatedAt: now });

      // Reject other pending applications
      const otherApps = await db.collection('applications')
        .where('project', '==', appData.project).where('status', '==', 'pending').get();
      const batch = db.batch();
      otherApps.docs.forEach(d => { if (d.id !== req.params.id) batch.update(d.ref, { status: 'rejected', updatedAt: now }); });
      await batch.commit();

      // Find or create conversation
      let convSnap = await db.collection('conversations').where('project', '==', appData.project).where('company', '==', appData.company).limit(1).get();
      let conversation;
      if (convSnap.empty) {
        const convData = { project: appData.project, application: req.params.id, client: project.client, company: appData.company, lastMessage: null, lastMessageTime: now, unreadCountClient: 0, unreadCountCompany: 0, createdAt: now, updatedAt: now };
        const convRef = await db.collection('conversations').add(convData);
        conversation = { id: convRef.id, ...convData };
      } else {
        conversation = { id: convSnap.docs[0].id, ...convSnap.docs[0].data() };
      }

      if (io) {
        io.to(`client-${project.client}`).emit('conversationStarted', { conversation });
        io.to(`company-${appData.company}`).emit('conversationStarted', { conversation });
      }
    }

    if (io) {
      io.to(`company-${appData.company}`).emit('applicationStatusUpdate', { applicationId: req.params.id, status, projectTitle: project.title });
    }

    res.json({ message: 'Application status updated successfully', application: { id: req.params.id, ...appData, status } });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error while updating application' });
  }
});

// DELETE /api/applications/:id
router.delete('/:id', [auth, isCompany], async (req, res) => {
  try {
    const appDoc = await db.collection('applications').doc(req.params.id).get();
    if (!appDoc.exists) return res.status(404).json({ message: 'Application not found' });
    const appData = appDoc.data();
    if (appData.company !== req.userId) return res.status(403).json({ message: 'Not authorized to delete this application' });
    if (appData.status !== 'pending') return res.status(400).json({ message: 'Cannot withdraw an application that has been processed' });

    const now = new Date();
    const projectDoc = await db.collection('projects').doc(appData.project).get();
    if (projectDoc.exists) {
      const cnt = (projectDoc.data().applicantsCount || 1) - 1;
      await db.collection('projects').doc(appData.project).update({ applicantsCount: Math.max(0, cnt), updatedAt: now });
    }

    await db.collection('applications').doc(req.params.id).delete();
    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'Server error while deleting application' });
  }
});

module.exports = router;
