const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { 
  createRaciMatrix, 
  getRaciMatrixByEvent,
  updateRaciMatrix, 
  deleteRaciMatrix,
  createRaciApprovals,
  getPendingApprovals,
  getPendingApprovalsWithAutoCreate,
  debugEventApprovals,
  getRaciMatrixForApproval,
  approveRejectRaciMatrix,
  getRaciApprovalStatus,
  refreshRaciApprovalStatus,
  getEligibleApprovers,
  getMyApprovalHistory,
  getEligibleEventsForRaci,
  getAllApprovedEventsForRaci,
  getApprovedEventsForDropdown
} = require('../controllers/raciController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// RACI routes
router
  .route('/')
  .post(authorize('company_admin', 'hod'), createRaciMatrix);

router
  .route('/events/:eventId')
  .get(getRaciMatrixByEvent);

router
  .route('/:id')
  .put(authorize('company_admin', 'hod'), updateRaciMatrix)
  .delete(authorize('company_admin'), deleteRaciMatrix);

// RACI Approval routes
router
  .route('/:eventId/approvals')
  .post(authorize('company_admin', 'hod'), createRaciApprovals);

router
  .route('/approvals/pending')
  .get(getPendingApprovals);

router
  .route('/approvals/pending-with-auto-create')
  .get(authorize('company_admin'), getPendingApprovalsWithAutoCreate);

router
  .route('/approvals/my-history')
  .get(getMyApprovalHistory);

router
  .route('/:eventId/approval-view')
  .get(getRaciMatrixForApproval);

router
  .route('/:eventId/approve')
  .post(approveRejectRaciMatrix);

router
  .route('/:eventId/approval-status')
  .get(getRaciApprovalStatus);

router
  .route('/:eventId/debug-approvals')
  .get(debugEventApprovals);

router
  .route('/:eventId/refresh-status')
  .get(refreshRaciApprovalStatus);

router
  .route('/eligible-approvers')
  .get(authorize('company_admin', 'hod'), getEligibleApprovers);

// Get events eligible for RACI matrix creation
router
  .route('/eligible-events')
  .get(authorize('company_admin', 'hod'), getEligibleEventsForRaci);

// Get all approved events for RACI matrix creation
router
  .route('/all-approved-events')
  .get(authorize('company_admin', 'hod'), getAllApprovedEventsForRaci);

// Get approved events for dropdown selection
router
  .route('/events-dropdown')
  .get(authorize('company_admin', 'hod'), getApprovedEventsForDropdown);

module.exports = router;
   