const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { 
  createRaciMatrix, 
  getRaciMatrixByEvent,
  updateRaciMatrix, 
  deleteRaciMatrix 
} = require('../controllers/raciController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// RACI routes
router
  .route('/')
  .post(authorize('company_admin', 'hod'), createRaciMatrix);

router
  .route('/:id')
  .put(authorize('company_admin', 'hod'), updateRaciMatrix)
  .delete(authorize('company_admin'), deleteRaciMatrix);

module.exports = router;
   