const Notification = require('../models/notification.model');

async function notifyUser(userId, type, message, relatedId = null) {
  try {
    await Notification.create({ userId, type, message, relatedId });
  } catch (err) {
    // Notification failures must never break the main flow.
    // eslint-disable-next-line no-console
    console.error('[notify]', err.message);
  }
}

async function notifyUsers(userIds, type, message, relatedId = null) {
  if (!userIds || userIds.length === 0) return;
  const docs = userIds.map((userId) => ({ userId, type, message, relatedId }));
  try {
    await Notification.insertMany(docs);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifyMany]', err.message);
  }
}

module.exports = { notifyUser, notifyUsers };
