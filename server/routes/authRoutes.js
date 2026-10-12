const express = require('express');
const auth = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/me', protect, auth.getMe);
router.patch('/me', protect, auth.updateMe);
router.patch('/password', protect, auth.changePassword);

module.exports = router;
