const express = require('express');
const { protect } = require('../middleware/auth');
const { getMyRaciAssignments } = require('../controllers/userRaciController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get my RACI assignments route
router.get('/my-assignments', getMyRaciAssignments);

module.exports = router;
