const express = require('express');
const animals = require('../controllers/animalController');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { upload } = require('../middleware/upload');
const { MAX_PHOTOS } = require('../utils/constants');

const router = express.Router();

router.get('/', optionalAuth, animals.listAnimals);
router.get('/map', animals.mapAnimals);

router.get('/mine', protect, authorize('shelter'), animals.myAnimals);
router.get('/favourites', protect, animals.myFavourites);

router.get('/:id', optionalAuth, animals.getAnimal);
router.post('/:id/favourite', protect, animals.toggleFavourite);

router.post('/', protect, authorize('shelter'), upload.array('photos', MAX_PHOTOS), animals.createAnimal);
router.patch('/:id', protect, authorize('shelter', 'admin'), upload.array('photos', MAX_PHOTOS), animals.updateAnimal);
router.delete('/:id', protect, authorize('shelter', 'admin'), animals.deleteAnimal);
router.patch('/:id/active', protect, authorize('admin'), animals.setActive);

module.exports = router;
