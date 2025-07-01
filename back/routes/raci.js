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
  getMyApprovalHistory
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

module.exports = router;
   