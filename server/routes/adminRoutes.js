const express = require('express');
const admin = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/stats', admin.stats);
router.get('/activity', admin.recentActivity);
router.get('/animals', admin.listAnimals);
router.get('/shelters', admin.listShelters);
router.patch('/shelters/:id/verify', admin.verifyShelter);
router.get('/users', admin.listUsers);
router.post('/run-reminders', admin.runReminders);

module.exports = router;
