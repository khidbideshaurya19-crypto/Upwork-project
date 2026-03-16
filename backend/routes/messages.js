const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Application = require('../models/Application');
const Project = require('../models/Project');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { analyzeMessage } = require('../utils/chatModeration');
const ChatAlert = require('../models/ChatAlert');

// ---- Helpers ----
function toDate(v) {
  if (!v) return null;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

async function populateConversation(conv) {
  if (!conv) return null;
  const [client, company, project, lastMessage] = await Promise.all([
    conv.client ? User.findById(conv.client) : Promise.resolve(null),
    conv.company ? User.findById(conv.company) : Promise.resolve(null),
    conv.project ? Project.findById(conv.project) : Promise.resolve(null),
    conv.lastMessage ? Message.findById(conv.lastMessage) : Promise.resolve(null)
  ]);
  const { _isNew, ...rest } = conv;
  return {
    ...rest, _id: conv._id, id: conv._id,
    client: client ? { _id: client._id, name: client.name, email: client.email, profileImage: client.profileImage } : conv.client,
    company: company ? { _id: company._id, name: company.name, companyName: company.companyName, email: company.email, profileImage: company.profileImage } : conv.company,
    project: project ? { _id: project._id, title: project.title } : conv.project,
    lastMessage: lastMessage ? msgToJSON(lastMessage) : null
  };
}

async function populateMessage(msg) {
  if (!msg) return null;
  const sender = msg.sender ? await User.findById(msg.sender) : null;
  return {
    ...msgToJSON(msg),
    sender: sender ? { _id: sender._id, name: sender.name, companyName: sender.companyName, email: sender.email, profileImage: sender.profileImage } : msg.sender
  };
}

function msgToJSON(m) {
  if (!m) return null;
  const { _isNew, ...rest } = m;
  return { ...rest, _id: m._id, id: m._id };
}

// GET /api/messages/conversations — All conversations for current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const query = req.user.role === 'client' ? { client: req.userId } : { company: req.userId };
    let convs = await Conversation.find(query);
    convs.sort((a, b) => toDate(b.lastMessageTime || b.updatedAt) - toDate(a.lastMessageTime || a.updatedAt));
    const conversations = await Promise.all(convs.map(c => populateConversation(c)));
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error while fetching conversations' });
  }
});

// GET /api/messages/conversation/:conversationId — Messages in a conversation
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conv.client.toString() === req.userId || conv.company.toString() === req.userId;
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    let msgs = await Message.find({ conversation: req.params.conversationId });
    msgs.sort((a, b) => toDate(a.createdAt) - toDate(b.createdAt));

    const [populatedConv, messages] = await Promise.all([
      populateConversation(conv),
      Promise.all(msgs.map(m => populateMessage(m)))
    ]);

    res.json({ conversation: populatedConv, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
});

// POST /api/messages/conversation/:conversationId — Send a message
router.post('/conversation/:conversationId', [auth, upload.array('attachments', 3)], async (req, res) => {
  try {
    const { content } = req.body;
    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conv.client.toString() === req.userId || conv.company.toString() === req.userId;
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const attachments = (req.files || []).map(f => ({
      filename: f.filename, originalName: f.originalname, path: f.path, mimetype: f.mimetype, size: f.size
    }));

    const message = new Message({
      conversation: req.params.conversationId,
      sender: req.userId, senderRole: req.user.role,
      content, attachments, status: 'sent'
    });
    await message.save();

    // --- Chat Moderation: scan for outside-platform activity ---
    if (content) {
      const modResult = analyzeMessage(content);
      if (modResult.flagged) {
        const alert = new ChatAlert({
          conversationId: req.params.conversationId,
          messageId: message._id,
          senderId: req.userId,
          senderRole: req.user.role,
          messageContent: content,
          reasons: modResult.reasons,
          severity: modResult.severity,
          status: 'pending',
        });
        // Save alert in background — don't block the message send
        alert.save().catch(err => console.error('Chat alert save error:', err));
      }
    }
    // --- End Chat Moderation ---

    // Update conversation
    conv.lastMessage = message._id;
    conv.lastMessageTime = message.createdAt;
    if (req.user.role === 'client') conv.unreadCountCompany = (conv.unreadCountCompany || 0) + 1;
    else conv.unreadCountClient = (conv.unreadCountClient || 0) + 1;
    await conv.save();

    const populatedMsg = await populateMessage(message);

    res.status(201).json({ message: populatedMsg });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

// PUT /api/messages/conversation/:conversationId/read — Mark messages as read
router.put('/conversation/:conversationId/read', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conv.client.toString() === req.userId || conv.company.toString() === req.userId;
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    // Get unread messages from the other party
    let allMsgs = await Message.find({ conversation: req.params.conversationId });
    const messagesToUpdate = allMsgs.filter(m => m.sender.toString() !== req.userId && m.status !== 'read');

    // Mark each as read
    for (const m of messagesToUpdate) {
      m.status = 'read';
      await m.save();
    }

    if (req.user.role === 'client') conv.unreadCountClient = 0;
    else conv.unreadCountCompany = 0;
    await conv.save();

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/messages/start — Start a new conversation
router.post('/start', auth, async (req, res) => {
  try {
    const { projectId, companyId, applicationId, clientId } = req.body;

    if (!projectId) return res.status(400).json({ message: 'projectId is required' });

    let finalClientId = clientId;
    let finalCompanyId = companyId;

    if (applicationId) {
      const application = await Application.findById(applicationId);
      if (!application) return res.status(404).json({ message: 'Application not found' });

      const appProject = await Project.findById(application.project);
      if (!appProject || appProject._id.toString() !== projectId) return res.status(400).json({ message: 'Application does not belong to this project' });
      if (companyId && application.company.toString() !== companyId) return res.status(400).json({ message: 'Application mismatch' });
      if (application.status === 'rejected') return res.status(400).json({ message: 'Conversation cannot start for rejected applications' });

      finalClientId = appProject.client.toString();
      finalCompanyId = application.company.toString();
    } else {
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      finalClientId = project.client.toString();
      finalCompanyId = req.user.role === 'company' ? req.userId : companyId;
      if (!finalCompanyId) return res.status(400).json({ message: 'companyId is required' });
    }

    const isProjectClient = req.user.role === 'client' && finalClientId === req.userId;
    const isCompanyUser = req.user.role === 'company' && finalCompanyId === req.userId;
    if (!isProjectClient && !isCompanyUser) return res.status(403).json({ message: 'Not authorized' });

    let conversation = await Conversation.findOne({ client: finalClientId, company: finalCompanyId });
    if (conversation) {
      const populated = await populateConversation(conversation);
      return res.json({ conversation: populated, alreadyExists: true });
    }

    conversation = new Conversation({
      project: projectId, application: applicationId || null,
      client: finalClientId, company: finalCompanyId,
      unreadCountClient: 0, unreadCountCompany: 0
    });
    await conversation.save();
    const populated = await populateConversation(conversation);

    res.status(201).json({ conversation: populated, alreadyExists: false });
  } catch (error) {
    console.error('Start conversation error:', error.stack || error);
    res.status(500).json({ message: 'Server error while starting conversation', error: error.message });
  }
});

// PUT /api/messages/:messageId — Edit a message
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Content is required' });

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // --- Chat Moderation: scan edited message ---
    const modResult = analyzeMessage(content.trim());
    if (modResult.flagged) {
      const alert = new ChatAlert({
        conversationId: message.conversation,
        messageId: message._id,
        senderId: req.userId,
        senderRole: req.user.role,
        messageContent: content.trim(),
        reasons: modResult.reasons,
        severity: modResult.severity,
        status: 'pending',
      });
      alert.save().catch(err => console.error('Chat alert save error:', err));
    }
    // --- End Chat Moderation ---

    const populatedMsg = await populateMessage(message);

    res.json({ message: populatedMsg });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error while editing message' });
  }
});

// DELETE /api/messages/:messageId — Delete a message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });

    const convId = message.conversation;
    await message.deleteOne();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error while deleting message' });
  }
});

// DELETE /api/messages/conversation/:conversationId — Delete entire conversation
router.delete('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conv.client.toString() === req.userId || conv.company.toString() === req.userId;
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    await Message.deleteMany({ conversation: req.params.conversationId });
    await conv.deleteOne();

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error while deleting conversation' });
  }
});

// DELETE /api/messages/conversation/:conversationId/clear — Clear chat history
router.delete('/conversation/:conversationId/clear', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conv.client.toString() === req.userId || conv.company.toString() === req.userId;
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    await Message.deleteMany({ conversation: req.params.conversationId });
    conv.lastMessage = null;
    conv.unreadCountClient = 0;
    conv.unreadCountCompany = 0;
    await conv.save();

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: 'Server error while clearing chat' });
  }
});

module.exports = router;
