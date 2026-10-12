const express = require('express');
const admin = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/stats', admin.stats);
router.get('/shelters', admin.listShelters);
router.patch('/shelters/:id/verify', admin.verifyShelter);
router.get('/users', admin.listUsers);
router.post('/run-reminders', admin.runReminders);

module.exports = router;
