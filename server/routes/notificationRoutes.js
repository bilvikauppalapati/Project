const express = require('express');
const notifications = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', notifications.listNotifications);
router.patch('/read-all', notifications.markAllRead);
router.patch('/:id/read', notifications.markRead);
router.delete('/:id', notifications.deleteNotification);

module.exports = router;
