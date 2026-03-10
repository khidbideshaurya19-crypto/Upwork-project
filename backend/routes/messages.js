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

        // Notify admin panel via socket
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('chatAlert', {
            alertId: alert._id,
            severity: modResult.severity,
            reasons: modResult.reasons,
            senderRole: req.user.role,
            conversationId: req.params.conversationId,
          });
        }
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

    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' ? conv.company.toString() : conv.client.toString();
      io.to(`${recipientRole}-${recipientId}`).emit('newMessage', { conversationId: conv._id, message: populatedMsg });
      io.to(`${req.user.role}-${req.userId}`).emit('newMessage', { conversationId: conv._id, message: populatedMsg });

      // Update to delivered
      message.status = 'delivered';
      await message.save();
      io.to(`${req.user.role}-${req.userId}`).emit('messageStatusUpdate', { conversationId: conv._id, messageId: message._id, status: 'delivered' });
    }

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

    const io = req.app.get('io');
    if (io) {
      const otherRole = req.user.role === 'client' ? 'company' : 'client';
      const otherId = req.user.role === 'client' ? conv.company.toString() : conv.client.toString();
      messagesToUpdate.forEach(m => {
        io.to(`${otherRole}-${otherId}`).emit('messageStatusUpdate', { conversationId: conv._id, messageId: m._id.toString(), status: 'read' });
      });
      io.to(`${otherRole}-${otherId}`).emit('messagesRead', { conversationId: conv._id });
    }

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

    const io = req.app.get('io');
    if (io) {
      io.to(`client-${finalClientId}`).emit('conversationStarted', { conversation: populated });
      io.to(`company-${finalCompanyId}`).emit('conversationStarted', { conversation: populated });
    }

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

      const ioAlert = req.app.get('io');
      if (ioAlert) {
        ioAlert.to('admin-room').emit('chatAlert', {
          alertId: alert._id,
          severity: modResult.severity,
          reasons: modResult.reasons,
          senderRole: req.user.role,
          conversationId: message.conversation,
        });
      }
    }
    // --- End Chat Moderation ---

    const populatedMsg = await populateMessage(message);
    const conv = await Conversation.findById(message.conversation);
    const io = req.app.get('io');
    if (io && conv) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' ? conv.company.toString() : conv.client.toString();
      io.to(`${recipientRole}-${recipientId}`).emit('messageEdited', { conversationId: message.conversation, message: populatedMsg });
      io.to(`${req.user.role}-${req.userId}`).emit('messageEdited', { conversationId: message.conversation, message: populatedMsg });
    }

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

    const conv = await Conversation.findById(convId);
    const io = req.app.get('io');
    if (io && conv) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' ? conv.company.toString() : conv.client.toString();
      io.to(`${recipientRole}-${recipientId}`).emit('messageDeleted', { conversationId: convId, messageId: req.params.messageId });
      io.to(`${req.user.role}-${req.userId}`).emit('messageDeleted', { conversationId: convId, messageId: req.params.messageId });
    }

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

    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' ? conv.company.toString() : conv.client.toString();
      io.to(`${recipientRole}-${recipientId}`).emit('conversationDeleted', { conversationId: req.params.conversationId });
    }

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

    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' ? conv.company.toString() : conv.client.toString();
      io.to(`${recipientRole}-${recipientId}`).emit('chatCleared', { conversationId: req.params.conversationId });
    }

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: 'Server error while clearing chat' });
  }
});

module.exports = router;


// @route   GET /api/messages/conversations
// @desc    Get all conversations for current user
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const query = req.user.role === 'client' 
      ? { client: req.userId }
      : { company: req.userId };

    const conversations = await Conversation.find(query)
      .populate('project', 'title')
      .populate('client', 'name email profileImage')
      .populate('company', 'name companyName email profileImage')
      .populate('lastMessage')
      .sort({ lastMessageTime: -1 });

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error while fetching conversations' });
  }
});

// @route   GET /api/messages/conversation/:conversationId
// @desc    Get all messages in a conversation
// @access  Private
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId)
      .populate('client', 'name email profileImage')
      .populate('company', 'name companyName email profileImage');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is part of this conversation
    const isParticipant = conversation.client._id.toString() === req.userId || 
                         conversation.company._id.toString() === req.userId;
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const messages = await Message.find({ conversation: req.params.conversationId })
      .populate('sender', 'name companyName email profileImage')
      .sort({ createdAt: 1 });

    res.json({ conversation, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
});

// @route   POST /api/messages/conversation/:conversationId
// @desc    Send a message in a conversation
// @access  Private
router.post('/conversation/:conversationId', [auth, upload.array('attachments', 3)], async (req, res) => {
  try {
    const { content } = req.body;
    const conversation = await Conversation.findById(req.params.conversationId)
      .populate('client company');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is part of this conversation
    const isParticipant = conversation.client._id.toString() === req.userId || 
                         conversation.company._id.toString() === req.userId;
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to send messages in this conversation' });
    }

    // Process uploaded files
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    const message = new Message({
      conversation: req.params.conversationId,
      sender: req.userId,
      senderRole: req.user.role,
      content,
      attachments,
      status: 'sent'
    });

    await message.save();
    await message.populate('sender', 'name companyName email');

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageTime = message.createdAt;
    
    // Increment unread count for the other party
    if (req.user.role === 'client') {
      conversation.unreadCountCompany += 1;
    } else {
      conversation.unreadCountClient += 1;
    }
    
    await conversation.save();

    // Emit socket event for real-time delivery
    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' 
        ? conversation.company._id.toString() 
        : conversation.client._id.toString();
      
      // Emit to recipient
      io.to(`${recipientRole}-${recipientId}`).emit('newMessage', {
        conversationId: conversation._id,
        message
      });
      
      // Also emit to sender for sync across devices
      io.to(`${req.user.role}-${req.userId}`).emit('newMessage', {
        conversationId: conversation._id,
        message
      });

      // Update message status to delivered and notify sender
      message.status = 'delivered';
      await message.save();
      
      // Notify sender about delivery status
      io.to(`${req.user.role}-${req.userId}`).emit('messageStatusUpdate', {
        conversationId: conversation._id,
        messageId: message._id,
        status: 'delivered'
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

// @route   PUT /api/messages/conversation/:conversationId/read
// @desc    Mark all messages in conversation as read
// @access  Private
router.put('/conversation/:conversationId/read', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is part of this conversation
    const isParticipant = conversation.client.toString() === req.userId || 
                         conversation.company.toString() === req.userId;
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get messages that need to be marked as read
    const messagesToUpdate = await Message.find({
      conversation: req.params.conversationId,
      sender: { $ne: req.userId },
      status: { $ne: 'read' }
    });

    // Mark all unread messages as read
    await Message.updateMany(
      {
        conversation: req.params.conversationId,
        sender: { $ne: req.userId },
        status: { $ne: 'read' }
      },
      { status: 'read' }
    );

    // Reset unread count
    if (req.user.role === 'client') {
      conversation.unreadCountClient = 0;
    } else {
      conversation.unreadCountCompany = 0;
    }
    
    await conversation.save();

    // Emit socket event to notify sender about each message read
    const io = req.app.get('io');
    if (io) {
      const otherPartyRole = req.user.role === 'client' ? 'company' : 'client';
      const otherPartyId = req.user.role === 'client' 
        ? conversation.company.toString() 
        : conversation.client.toString();
      
      // Emit individual status updates for each message
      messagesToUpdate.forEach(msg => {
        io.to(`${otherPartyRole}-${otherPartyId}`).emit('messageStatusUpdate', {
          conversationId: conversation._id,
          messageId: msg._id.toString(),
          status: 'read'
        });
      });
      
      // Also emit general messagesRead event
      io.to(`${otherPartyRole}-${otherPartyId}`).emit('messagesRead', {
        conversationId: conversation._id
      });
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/start
// @desc    Start a new conversation (when application is accepted or company initiates chat)
// @access  Private
router.post('/start', auth, async (req, res) => {
  try {
    const { projectId, companyId, applicationId, clientId } = req.body;

    console.log('Starting conversation with params:', { projectId, companyId, applicationId, clientId, userId: req.userId, userRole: req.user.role });

    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }

    // Determine client and company IDs
    let finalClientId = clientId;
    let finalCompanyId = companyId;

    // If application is provided, validate it
    if (applicationId) {
      const application = await Application.findById(applicationId).populate('project', 'client');

      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      if (!application.project || application.project._id.toString() !== projectId) {
        return res.status(400).json({ message: 'Application does not belong to this project' });
      }

      if (companyId && application.company.toString() !== companyId) {
        return res.status(400).json({ message: 'Application does not belong to this company' });
      }

      if (application.status === 'rejected') {
        return res.status(400).json({ message: 'Conversation cannot start for rejected applications' });
      }

      finalClientId = application.project.client.toString();
      finalCompanyId = application.company.toString();
    } else {
      // Company initiating chat from project listing
      const Project = require('../models/Project');
      const project = await Project.findById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      finalClientId = project.client.toString();
      finalCompanyId = req.user.role === 'company' ? req.userId : companyId;

      if (!finalCompanyId) {
        return res.status(400).json({ message: 'companyId is required when starting chat from project' });
      }

      console.log('Project chat - Client:', finalClientId, 'Company:', finalCompanyId);
    }

    // Check authorization
    const isProjectClient = req.user.role === 'client' && finalClientId === req.userId;
    const isCompany = req.user.role === 'company' && finalCompanyId === req.userId;

    console.log('Authorization check:', { isProjectClient, isCompany, userRole: req.user.role, userId: req.userId });

    if (!isProjectClient && !isCompany) {
      return res.status(403).json({ message: 'Not authorized to start this conversation' });
    }

    // Check if conversation already exists between this client and company (regardless of project)
    let conversation = await Conversation.findOne({
      client: finalClientId,
      company: finalCompanyId
    });

    if (conversation) {
      console.log('Found existing conversation:', conversation._id);
      await conversation.populate([
        { path: 'project', select: 'title' },
        { path: 'client', select: 'name email profileImage' },
        { path: 'company', select: 'name companyName email profileImage' }
      ]);
      return res.json({ conversation, alreadyExists: true });
    }

    // Create new conversation
    console.log('Creating new conversation for project:', projectId, 'client:', finalClientId, 'company:', finalCompanyId);
    
    conversation = new Conversation({
      project: projectId,
      application: applicationId || null,
      client: finalClientId,
      company: finalCompanyId
    });

    await conversation.save();
    console.log('Conversation saved with ID:', conversation._id);
    
    await conversation.populate([
      { path: 'project', select: 'title' },
      { path: 'client', select: 'name email profileImage' },
      { path: 'company', select: 'name companyName email profileImage' }
    ]);
    console.log('Conversation populated successfully');

    const io = req.app.get('io');
    if (io) {
      io.to(`client-${finalClientId}`).emit('conversationStarted', {
        conversation
      });
      io.to(`company-${finalCompanyId}`).emit('conversationStarted', {
        conversation
      });
    }

    console.log('Returning conversation:', conversation._id);
    res.status(201).json({ conversation, alreadyExists: false });
  } catch (error) {
    console.error('Start conversation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error while starting conversation', error: error.message });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Edit a specific message
// @access  Private
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can edit their own message
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('sender', 'name companyName email');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const conversation = await Conversation.findById(message.conversation);
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' 
        ? conversation.company.toString() 
        : conversation.client.toString();
      
      io.to(`${recipientRole}-${recipientId}`).emit('messageEdited', {
        conversationId: message.conversation,
        message
      });
      
      // Also emit to sender for sync across devices
      io.to(`${req.user.role}-${req.userId}`).emit('messageEdited', {
        conversationId: message.conversation,
        message
      });
    }

    res.json({ message });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error while editing message' });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a specific message
// @access  Private
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete their own message
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    const conversationId = message.conversation;
    await Message.findByIdAndDelete(req.params.messageId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const conversation = await Conversation.findById(conversationId);
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' 
        ? conversation.company.toString() 
        : conversation.client.toString();
      
      io.to(`${recipientRole}-${recipientId}`).emit('messageDeleted', {
        conversationId: conversationId,
        messageId: req.params.messageId
      });
      
      // Also emit to sender for sync across devices
      io.to(`${req.user.role}-${req.userId}`).emit('messageDeleted', {
        conversationId: conversationId,
        messageId: req.params.messageId
      });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error while deleting message' });
  }
});

// @route   DELETE /api/messages/conversation/:conversationId
// @desc    Delete entire conversation
// @access  Private
router.delete('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is part of this conversation
    const isParticipant = conversation.client.toString() === req.userId || 
                         conversation.company.toString() === req.userId;
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation: req.params.conversationId });

    // Delete the conversation
    await Conversation.findByIdAndDelete(req.params.conversationId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' 
        ? conversation.company.toString() 
        : conversation.client.toString();
      
      io.to(`${recipientRole}-${recipientId}`).emit('conversationDeleted', {
        conversationId: req.params.conversationId
      });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error while deleting conversation' });
  }
});

// @route   DELETE /api/messages/conversation/:conversationId/clear
// @desc    Clear chat history (delete all messages but keep conversation)
// @access  Private
router.delete('/conversation/:conversationId/clear', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is part of this conversation
    const isParticipant = conversation.client.toString() === req.userId || 
                         conversation.company.toString() === req.userId;
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation: req.params.conversationId });

    // Reset conversation metadata
    conversation.lastMessage = null;
    conversation.unreadCountClient = 0;
    conversation.unreadCountCompany = 0;
    await conversation.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' 
        ? conversation.company.toString() 
        : conversation.client.toString();
      
      io.to(`${recipientRole}-${recipientId}`).emit('chatCleared', {
        conversationId: req.params.conversationId
      });
    }

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: 'Server error while clearing chat' });
  }
});

module.exports = router;
