const Notification = require('../models/Notification');

async function createNotification({ userId, type, title, message, link = '', data = {}, createdBy = null }) {
  if (!userId || !title || !message) return null;

  const notification = new Notification({
    userId: String(userId),
    type: type || 'general',
    title: String(title),
    message: String(message),
    link: link || '',
    data: data || {},
    createdBy: createdBy || null,
    isRead: false,
    readAt: null
  });

  await notification.save();
  return notification;
}

async function createNotificationsBulk(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const output = [];
  for (const item of items) {
    const created = await createNotification(item);
    if (created) output.push(created);
  }
  return output;
}

module.exports = {
  createNotification,
  createNotificationsBulk
};
