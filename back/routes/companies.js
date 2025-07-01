const express = require('express');
const {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  updateCompanySettings,
  deleteCompany,
  getMyCompany,
  createDeletionRequest,
  getPendingDeletionRequests,
  processDeletionRequest,
  getAvailableApprovers,
  getAllDeletionRequests
} = require('../controllers/companyController');
const { protect, authorize, checkCompanyMember } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Company deletion request routes (before specific ID routes)
router
  .route('/deletion-requests/all')
  .get(authorize('website_admin'), getAllDeletionRequests);

router
  .route('/deletion-requests/pending')
  .get(authorize('website_admin'), getPendingDeletionRequests);

router
  .route('/deletion-requests/approvers')
  .get(authorize('website_admin'), getAvailableApprovers);

router
  .route('/deletion-requests/:requestId')
  .put(authorize('website_admin'), processDeletionRequest);

router
  .route('/')
  .get(authorize('website_admin'), getCompanies)
  .post(
    authorize('website_admin'),
    upload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'project_logo', maxCount: 1 },
      { name: 'logoUrl', maxCount: 1 },
      { name: 'projectLogo', maxCount: 1 }
    ]),
    createCompany
  );

router
  .route('/my-company')
  .get(authorize('company_admin', 'hod'), getMyCompany);

router
  .route('/:id')
  .get(checkCompanyMember, getCompanyById)
  .put(
    authorize('website_admin', 'company_admin'),
    upload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'project_logo', maxCount: 1 },
      { name: 'logoUrl', maxCount: 1 },
      { name: 'projectLogo', maxCount: 1 }
    ]),
    updateCompany
  )
  .delete(authorize('website_admin'), deleteCompany);

router
  .route('/:id/settings')
  .patch(authorize('company_admin'), checkCompanyMember, updateCompanySettings);

router
  .route('/:id/deletion-request')
  .post(authorize('website_admin'), createDeletionRequest);

module.exports = router;
