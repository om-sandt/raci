const express = require('express');
const { protect } = require('../middleware/auth');
const meetingController = require('../controllers/meetingController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Specific routes must come before parameterized routes
router.get('/calendar', meetingController.getMeetingsByDateRange);

// Use controller methods instead of placeholders
router
  .route('/')
  .get(meetingController.getMeetings)
  .post(meetingController.createMeeting);

router
  .route('/:id')
  .get(meetingController.getMeetingById)
  .put(meetingController.updateMeeting)
  .delete(meetingController.deleteMeeting);

module.exports = router;
