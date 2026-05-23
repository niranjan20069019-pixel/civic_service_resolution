const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const NotificationService = require('../services/notification.service');
const { sendSuccess, sendError } = require('../utils/response');

const router = Router();
router.use(authenticate);

// GET /api/notifications — list current user's notifications
router.get('/', (req, res) => {
  const notifications = NotificationService.getForUser(req.user.id);
  const unread = notifications.filter(n => !n.read).length;
  sendSuccess(res, { data: { notifications, unread } });
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', (req, res) => {
  const ok = NotificationService.markRead(req.params.id, req.user.id);
  if (!ok) return sendError(res, { message: 'Notification not found', statusCode: 404 });
  sendSuccess(res, { message: 'Marked as read', data: null });
});

module.exports = router;
