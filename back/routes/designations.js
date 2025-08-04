const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getAllDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation
} = require('../controllers/designationController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Apply company admin authorization to all routes
router.use(authorize('company_admin', 'website_admin'));

// Designation routes
router
  .route('/')
  .get(getAllDesignations)
  .post(createDesignation);

router
  .route('/:id')
  .get(getDesignationById)
  .put(updateDesignation)
  .delete(deleteDesignation);

module.exports = router; 