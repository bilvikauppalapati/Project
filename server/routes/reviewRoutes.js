const express = require('express');
const reviews = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.get('/shelter/:shelterId', reviews.shelterReviews);
router.get('/mine', protect, authorize('adopter'), reviews.myReviews);
router.post('/', protect, authorize('adopter'), reviews.createReview);
router.patch('/:id', protect, authorize('adopter'), reviews.updateReview);
router.delete('/:id', protect, authorize('adopter', 'admin'), reviews.deleteReview);

module.exports = router;
