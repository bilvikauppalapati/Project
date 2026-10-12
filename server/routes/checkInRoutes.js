const express = require('express');
const checkIns = require('../controllers/checkInController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/mine', authorize('adopter'), checkIns.myCheckIns);
router.get('/shelter', authorize('shelter'), checkIns.shelterCheckIns);
router.get('/application/:applicationId', checkIns.applicationCheckIns);
router.post('/application/:applicationId/updates', authorize('adopter'), upload.single('photo'), checkIns.logHealthUpdate);
router.get('/:id', checkIns.getCheckIn);
router.post('/:id/complete', authorize('adopter'), upload.single('photo'), checkIns.completeCheckIn);

module.exports = router;
