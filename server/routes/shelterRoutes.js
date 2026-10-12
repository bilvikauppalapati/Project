const express = require('express');
const shelters = require('../controllers/shelterController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.get('/', shelters.listShelters);
router.get('/nearby', shelters.nearbyShelters);
router.get('/me/dashboard', protect, authorize('shelter'), shelters.myDashboard);
router.get('/:id', shelters.getShelter);

module.exports = router;
