const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

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
      .populate('client', 'name email')
      .populate('company', 'name companyName email')
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
      .populate('client', 'name email')
      .populate('company', 'name companyName email');

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
      .populate('sender', 'name companyName email')
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
      
      io.to(`${recipientRole}-${recipientId}`).emit('newMessage', {
        conversationId: conversation._id,
        message
      });

      // Update message status to delivered
      message.status = 'delivered';
      await message.save();
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

    // Emit socket event to notify sender
    const io = req.app.get('io');
    if (io) {
      const otherPartyRole = req.user.role === 'client' ? 'company' : 'client';
      const otherPartyId = req.user.role === 'client' 
        ? conversation.company.toString() 
        : conversation.client.toString();
      
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
// @desc    Start a new conversation (when application is accepted)
// @access  Private
router.post('/start', auth, async (req, res) => {
  try {
    const { projectId, companyId, applicationId } = req.body;

    if (!projectId || !companyId || !applicationId) {
      return res.status(400).json({ message: 'projectId, companyId and applicationId are required' });
    }

    const application = await Application.findById(applicationId).populate('project', 'client');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (!application.project || application.project._id.toString() !== projectId) {
      return res.status(400).json({ message: 'Application does not belong to this project' });
    }

    if (application.company.toString() !== companyId) {
      return res.status(400).json({ message: 'Application does not belong to this company' });
    }

    if (application.status === 'rejected') {
      return res.status(400).json({ message: 'Conversation cannot start for rejected applications' });
    }

    const isProjectClient = req.user.role === 'client' && application.project.client.toString() === req.userId;
    const isAcceptedCompany = req.user.role === 'company' && application.company.toString() === req.userId;

    if (!isProjectClient && !isAcceptedCompany) {
      return res.status(403).json({ message: 'Not authorized to start this conversation' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      project: projectId,
      company: companyId
    });

    if (conversation) {
      await conversation.populate('project client company');
      return res.json({ conversation, alreadyExists: true });
    }

    // Create new conversation
    conversation = new Conversation({
      project: projectId,
      application: application._id,
      client: application.project.client,
      company: companyId
    });

    await conversation.save();
    await conversation.populate('project client company');

    const io = req.app.get('io');
    if (io) {
      io.to(`client-${conversation.client._id.toString()}`).emit('conversationStarted', {
        conversation
      });
      io.to(`company-${conversation.company._id.toString()}`).emit('conversationStarted', {
        conversation
      });
    }

    res.status(201).json({ conversation, alreadyExists: false });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ message: 'Server error while starting conversation' });
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

    await Message.findByIdAndDelete(req.params.messageId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const conversation = await Conversation.findById(message.conversation);
      const recipientRole = req.user.role === 'client' ? 'company' : 'client';
      const recipientId = req.user.role === 'client' 
        ? conversation.company.toString() 
        : conversation.client.toString();
      
      io.to(`${recipientRole}-${recipientId}`).emit('messageDeleted', {
        conversationId: message.conversation,
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
