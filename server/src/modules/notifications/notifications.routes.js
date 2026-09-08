const router = require('express').Router();
const { authenticateUser } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const Notification = require('../../models/notification.model');
const { paginateOptions, paginateResult } = require('../../utils/pagination');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = { userId: req.user.id };
  const [docs, total] = await Promise.all([
    Notification.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
  return ok(res, { count });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, _id: { $in: req.body.ids || [] } }, { isRead: true });
  return ok(res, null, 'Marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id }, { isRead: true });
  return ok(res, null, 'All notifications read');
});

router.get('/', authenticateUser, list);
router.get('/unread-count', authenticateUser, unreadCount);
router.post('/read', authenticateUser, markRead);
router.post('/read-all', authenticateUser, markAllRead);

module.exports = router;
