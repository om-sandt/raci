const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/locationController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Apply company admin authorization to all routes
router.use(authorize('company_admin', 'website_admin'));

// Location routes
router
  .route('/')
  .get(getAllLocations)
  .post(createLocation);

router
  .route('/:id')
  .get(getLocationById)
  .put(updateLocation)
  .delete(deleteLocation);

module.exports = router; 