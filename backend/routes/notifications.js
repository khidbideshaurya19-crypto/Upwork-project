const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;
    const query = { userId: req.userId };
    if (unreadOnly === 'true') query.isRead = false;

    const all = await Notification.find(query);
    all.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));

    const pageN = Math.max(1, parseInt(page, 10) || 1);
    const limitN = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const total = all.length;
    const notifications = all
      .slice((pageN - 1) * limitN, pageN * limitN)
      .map((n) => n.toJSON());

    res.json({
      notifications,
      pagination: {
        total,
        page: pageN,
        limit: limitN,
        pages: Math.ceil(total / limitN)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ userId: req.userId, isRead: false });
    res.json({ unreadCount });
  } catch (error) {
    console.error('Unread notification count error:', error);
    res.status(500).json({ message: 'Server error while fetching unread count' });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId, isRead: false });
    for (const n of notifications) {
      n.isRead = true;
      n.readAt = new Date();
      await n.save();
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error while updating notifications' });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.userId !== req.userId) return res.status(403).json({ message: 'Not authorized' });

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({ message: 'Notification marked as read', notification: notification.toJSON() });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error while updating notification' });
  }
});

module.exports = router;
