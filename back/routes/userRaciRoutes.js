const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const raciController = require('../controllers/raciController');

// GET /api/user-raci/my-assignments - For any authenticated user
router.get('/my-assignments', protect, raciController.getMyRaciAssignments);

module.exports = router;
