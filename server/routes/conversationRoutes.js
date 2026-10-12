const express = require('express');
const conversations = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', conversations.listConversations);
router.post('/', conversations.startConversation);
router.get('/unread-count', conversations.unreadCount);
router.get('/:id', conversations.getConversation);
router.get('/:id/messages', conversations.getMessages);
router.post('/:id/messages', conversations.postMessage);
router.patch('/:id/read', conversations.markRead);

module.exports = router;
