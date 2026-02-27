const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const getUser = async (id) => {
  if (!id) return null;
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data(); delete data.password;
  return { id: doc.id, ...data };
};

// GET /api/messages/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const field = req.user.role === 'client' ? 'client' : 'company';
    const snap = await db.collection('conversations').where(field, '==', req.userId).orderBy('lastMessageTime', 'desc').get();

    const conversations = await Promise.all(snap.docs.map(async d => {
      const data = d.data();
      data.client = await getUser(data.client);
      data.company = await getUser(data.company);
      if (data.project) {
        const pDoc = await db.collection('projects').doc(data.project).get();
        data.project = pDoc.exists ? { id: pDoc.id, title: pDoc.data().title } : null;
      }
      if (data.lastMessage) {
        const mDoc = await db.collection('messages').doc(data.lastMessage).get();
        data.lastMessage = mDoc.exists ? { id: mDoc.id, ...mDoc.data() } : null;
      }
      return { id: d.id, ...data };
    }));

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error while fetching conversations' });
  }
});

// GET /api/messages/conversation/:conversationId
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const convDoc = await db.collection('conversations').doc(req.params.conversationId).get();
    if (!convDoc.exists) return res.status(404).json({ message: 'Conversation not found' });
    const convData = convDoc.data();

    if (convData.client !== req.userId && convData.company !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    convData.client = await getUser(convData.client);
    convData.company = await getUser(convData.company);
    const conversation = { id: convDoc.id, ...convData };

    const msgsSnap = await db.collection('messages').where('conversation', '==', req.params.conversationId).orderBy('createdAt', 'asc').get();
    const messages = await Promise.all(msgsSnap.docs.map(async d => {
      const data = d.data();
      data.sender = await getUser(data.sender);
      return { id: d.id, ...data };
    }));

    res.json({ conversation, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
});

// POST /api/messages/conversation/:conversationId
router.post('/conversation/:conversationId', [auth, upload.array('attachments', 3)], async (req, res) => {
  try {
    const { content } = req.body;
    const convDoc = await db.collection('conversations').doc(req.params.conversationId).get();
    if (!convDoc.exists) return res.status(404).json({ message: 'Conversation not found' });
    const conv = convDoc.data();

    if (conv.client !== req.userId && conv.company !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to send messages in this conversation' });
    }

    const attachments = req.files ? req.files.map(f => ({ filename: f.filename, originalName: f.originalname, path: f.path, mimetype: f.mimetype, size: f.size })) : [];
    const now = new Date();

    const msgData = { conversation: req.params.conversationId, sender: req.userId, senderRole: req.user.role, content: content || '', attachments, status: 'sent', isEdited: false, editedAt: null, createdAt: now, updatedAt: now };
    const msgRef = await db.collection('messages').add(msgData);

    const convUpdates = { lastMessage: msgRef.id, lastMessageTime: now, updatedAt: now };
    if (req.user.role === 'client') convUpdates.unreadCountCompany = (conv.unreadCountCompany || 0) + 1;
    else convUpdates.unreadCountClient = (conv.unreadCountClient || 0) + 1;
    await db.collection('conversations').doc(req.params.conversationId).update(convUpdates);

    const senderData = await getUser(req.userId);
    const message = { id: msgRef.id, ...msgData, sender: senderData };

    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' ? conv.company : conv.client;
      io.to(`${recipientRole}-${recipientId}`).emit('newMessage', { conversationId: req.params.conversationId, message });
      io.to(`${req.user.role}-${req.userId}`).emit('newMessage', { conversationId: req.params.conversationId, message });
      await db.collection('messages').doc(msgRef.id).update({ status: 'delivered', updatedAt: new Date() });
      message.status = 'delivered';
      io.to(`${req.user.role}-${req.userId}`).emit('messageStatusUpdate', { conversationId: req.params.conversationId, messageId: msgRef.id, status: 'delivered' });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

// PUT /api/messages/conversation/:conversationId/read
router.put('/conversation/:conversationId/read', auth, async (req, res) => {
  try {
    const convDoc = await db.collection('conversations').doc(req.params.conversationId).get();
    if (!convDoc.exists) return res.status(404).json({ message: 'Conversation not found' });
    const conv = convDoc.data();

    if (conv.client !== req.userId && conv.company !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const msgsSnap = await db.collection('messages')
      .where('conversation', '==', req.params.conversationId)
      .where('sender', '!=', req.userId)
      .get();

    const batch = db.batch();
    const toUpdate = msgsSnap.docs.filter(d => d.data().status !== 'read');
    toUpdate.forEach(d => batch.update(d.ref, { status: 'read', updatedAt: new Date() }));
    await batch.commit();

    const convUpdates = { updatedAt: new Date() };
    if (req.user.role === 'client') convUpdates.unreadCountClient = 0;
    else convUpdates.unreadCountCompany = 0;
    await db.collection('conversations').doc(req.params.conversationId).update(convUpdates);

    const io = req.app.get('io');
    if (io) {
      const otherRole = req.user.role === 'client' ? 'company' : 'client';
      const otherId = req.user.role === 'client' ? conv.company : conv.client;
      toUpdate.forEach(d => {
        io.to(`${otherRole}-${otherId}`).emit('messageStatusUpdate', { conversationId: req.params.conversationId, messageId: d.id, status: 'read' });
      });
      io.to(`${otherRole}-${otherId}`).emit('messagesRead', { conversationId: req.params.conversationId });
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/messages/start
router.post('/start', auth, async (req, res) => {
  try {
    const { projectId, companyId, applicationId, clientId } = req.body;
    if (!projectId) return res.status(400).json({ message: 'projectId is required' });

    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return res.status(404).json({ message: 'Project not found' });
    const project = projectDoc.data();

    let finalClientId = clientId || project.client;
    let finalCompanyId = companyId || (req.user.role === 'company' ? req.userId : null);

    if (applicationId) {
      const appDoc = await db.collection('applications').doc(applicationId).get();
      if (!appDoc.exists) return res.status(404).json({ message: 'Application not found' });
      const app = appDoc.data();
      finalClientId = project.client;
      finalCompanyId = app.company;
    }

    if (!finalCompanyId) return res.status(400).json({ message: 'companyId is required' });

    const isProjectClient = req.user.role === 'client' && finalClientId === req.userId;
    const isCompanyUser = req.user.role === 'company' && finalCompanyId === req.userId;
    if (!isProjectClient && !isCompanyUser) return res.status(403).json({ message: 'Not authorized to start this conversation' });

    const existSnap = await db.collection('conversations')
      .where('client', '==', finalClientId).where('company', '==', finalCompanyId).limit(1).get();

    if (!existSnap.empty) {
      const convDoc = existSnap.docs[0];
      const convData = convDoc.data();
      convData.client = await getUser(convData.client);
      convData.company = await getUser(convData.company);
      if (convData.project) { const pd = await db.collection('projects').doc(convData.project).get(); convData.project = pd.exists ? { id: pd.id, title: pd.data().title } : null; }
      return res.json({ conversation: { id: convDoc.id, ...convData }, alreadyExists: true });
    }

    const now = new Date();
    const convData = { project: projectId, application: applicationId || null, client: finalClientId, company: finalCompanyId, lastMessage: null, lastMessageTime: now, unreadCountClient: 0, unreadCountCompany: 0, createdAt: now, updatedAt: now };
    const convRef = await db.collection('conversations').add(convData);
    const conversation = { id: convRef.id, ...convData };

    const io = req.app.get('io');
    if (io) {
      io.to(`client-${finalClientId}`).emit('conversationStarted', { conversation });
      io.to(`company-${finalCompanyId}`).emit('conversationStarted', { conversation });
    }

    res.status(201).json({ conversation, alreadyExists: false });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ message: 'Server error while starting conversation', error: error.message });
  }
});

// PUT /api/messages/:messageId (edit)
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Message content is required' });

    const msgDoc = await db.collection('messages').doc(req.params.messageId).get();
    if (!msgDoc.exists) return res.status(404).json({ message: 'Message not found' });
    const msg = msgDoc.data();
    if (msg.sender !== req.userId) return res.status(403).json({ message: 'Not authorized to edit this message' });

    const now = new Date();
    await db.collection('messages').doc(req.params.messageId).update({ content: content.trim(), isEdited: true, editedAt: now, updatedAt: now });
    const senderData = await getUser(req.userId);
    const updated = { id: req.params.messageId, ...msg, content: content.trim(), isEdited: true, editedAt: now, sender: senderData };

    const io = req.app.get('io');
    if (io) {
      const convDoc = await db.collection('conversations').doc(msg.conversation).get();
      if (convDoc.exists) {
        const conv = convDoc.data();
        const recipientRole = req.user.role === 'client' ? 'company' : 'client';
        const recipientId = req.user.role === 'client' ? conv.company : conv.client;
        io.to(`${recipientRole}-${recipientId}`).emit('messageEdited', { conversationId: msg.conversation, message: updated });
        io.to(`${req.user.role}-${req.userId}`).emit('messageEdited', { conversationId: msg.conversation, message: updated });
      }
    }

    res.json({ message: updated });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error while editing message' });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const msgDoc = await db.collection('messages').doc(req.params.messageId).get();
    if (!msgDoc.exists) return res.status(404).json({ message: 'Message not found' });
    const msg = msgDoc.data();
    if (msg.sender !== req.userId) return res.status(403).json({ message: 'Not authorized to delete this message' });

    await db.collection('messages').doc(req.params.messageId).delete();

    const io = req.app.get('io');
    if (io) {
      const convDoc = await db.collection('conversations').doc(msg.conversation).get();
      if (convDoc.exists) {
        const conv = convDoc.data();
        const recipientRole = req.user.role === 'client' ? 'company' : 'client';
        const recipientId = req.user.role === 'client' ? conv.company : conv.client;
        io.to(`${recipientRole}-${recipientId}`).emit('messageDeleted', { conversationId: msg.conversation, messageId: req.params.messageId });
        io.to(`${req.user.role}-${req.userId}`).emit('messageDeleted', { conversationId: msg.conversation, messageId: req.params.messageId });
      }
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error while deleting message' });
  }
});

// DELETE /api/messages/conversation/:conversationId
router.delete('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const convDoc = await db.collection('conversations').doc(req.params.conversationId).get();
    if (!convDoc.exists) return res.status(404).json({ message: 'Conversation not found' });
    const conv = convDoc.data();
    if (conv.client !== req.userId && conv.company !== req.userId) return res.status(403).json({ message: 'Not authorized' });

    const msgsSnap = await db.collection('messages').where('conversation', '==', req.params.conversationId).get();
    const batch = db.batch();
    msgsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('conversations').doc(req.params.conversationId));
    await batch.commit();

    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' ? conv.company : conv.client;
      io.to(`${recipientRole}-${recipientId}`).emit('conversationDeleted', { conversationId: req.params.conversationId });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error while deleting conversation' });
  }
});

// DELETE /api/messages/conversation/:conversationId/clear
router.delete('/conversation/:conversationId/clear', auth, async (req, res) => {
  try {
    const convDoc = await db.collection('conversations').doc(req.params.conversationId).get();
    if (!convDoc.exists) return res.status(404).json({ message: 'Conversation not found' });
    const conv = convDoc.data();
    if (conv.client !== req.userId && conv.company !== req.userId) return res.status(403).json({ message: 'Not authorized' });

    const msgsSnap = await db.collection('messages').where('conversation', '==', req.params.conversationId).get();
    const batch = db.batch();
    msgsSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    await db.collection('conversations').doc(req.params.conversationId).update({ lastMessage: null, unreadCountClient: 0, unreadCountCompany: 0, updatedAt: new Date() });

    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' ? conv.company : conv.client;
      io.to(`${recipientRole}-${recipientId}`).emit('chatCleared', { conversationId: req.params.conversationId });
    }

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: 'Server error while clearing chat' });
  }
});

module.exports = router;
