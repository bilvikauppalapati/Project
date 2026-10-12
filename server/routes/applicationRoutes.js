const express = require('express');
const applications = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.use(protect);

router.post('/', authorize('adopter'), applications.createApplication);
router.get('/mine', authorize('adopter'), applications.myApplications);
router.get('/incoming', authorize('shelter'), applications.incomingApplications);
router.get('/:id', applications.getApplication);
router.patch('/:id/status', applications.updateStatus);

module.exports = router;
