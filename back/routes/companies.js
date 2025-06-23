const express = require('express');
const {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  updateCompanySettings,
  deleteCompany,
  getMyCompany
} = require('../controllers/companyController');
const { protect, authorize, checkCompanyMember } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Special route for company admins to get their own company
router.get('/my-company', authorize('company_admin', 'hod'), getMyCompany);

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
  .patch(authorize('company_admin'), updateCompanySettings);

module.exports = router;
