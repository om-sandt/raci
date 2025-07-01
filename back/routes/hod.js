const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getDepartmentDetails } = require('../controllers/hodController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);
router.use(authorize('hod')); // Only HODs can access these routes

// Get department details route
router.get('/department-details', getDepartmentDetails);

module.exports = router;
