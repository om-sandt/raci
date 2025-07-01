const express = require('express');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  submitEvent,
  approveEvent
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getRaciMatrixByEvent } = require('../controllers/raciController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

router
  .route('/')
  .get(getEvents)
  .post(authorize('company_admin', 'hod'), upload.single('document'), createEvent);

router
  .route('/:id')
  .get(getEventById)
  .put(upload.single('document'), updateEvent)
  .delete(deleteEvent);

router.post('/:id/submit', submitEvent);
router.post('/:id/approve', approveEvent);

// Add RACI matrix route for specific event
router.get('/:eventId/raci-matrix', getRaciMatrixByEvent);

module.exports = router;
