const express = require('express');
const animals = require('../controllers/animalController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', optionalAuth, animals.listAnimals);
router.get('/map', animals.mapAnimals);

router.get('/mine', protect, authorize('shelter'), animals.myAnimals);
router.get('/favourites', protect, animals.myFavourites);

router.get('/:id', optionalAuth, animals.getAnimal);
router.post('/:id/favourite', protect, animals.toggleFavourite);

router.post('/', protect, authorize('shelter'), upload.array('photos', 6), animals.createAnimal);
router.patch('/:id', protect, authorize('shelter', 'admin'), upload.array('photos', 6), animals.updateAnimal);
router.delete('/:id', protect, authorize('shelter', 'admin'), animals.deleteAnimal);

module.exports = router;
