const express = require('express');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  submitEvent,
  approveEvent,
  getApprovedEventsForRaci,
  getApprovedEventsForRaciView
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const s3Upload = require('../middleware/s3Upload');
const { getRaciMatrixByEvent } = require('../controllers/raciController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

router
  .route('/')
  .get(getEvents)
  .post(authorize('company_admin', 'hod'), s3Upload.single('document'), createEvent);

router
  .route('/:id')
  .get(getEventById)
  .put(s3Upload.single('document'), updateEvent)
  .delete(deleteEvent);

router.post('/:id/submit', submitEvent);
router.post('/:id/approve', approveEvent);

// Add RACI matrix route for specific event
router.get('/:eventId/raci-matrix', getRaciMatrixByEvent);

// Get approved events ready for RACI assignment (company admin only)
router.get('/approved-for-raci', authorize('company_admin'), getApprovedEventsForRaci);

// Get all approved events for RACI assignment view (company admin only)
router.get('/approved-for-raci-view', authorize('company_admin'), getApprovedEventsForRaciView);

module.exports = router;
