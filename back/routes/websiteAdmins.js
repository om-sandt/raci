const express = require('express');
const {
  getWebsiteAdmins,
  getWebsiteAdminById,
  createWebsiteAdmin,
  updateWebsiteAdmin,
  deleteWebsiteAdmin,
  updateAdminPermissions,
  login
} = require('../controllers/websiteAdminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.post('/login', login);

// Protected routes (authentication required)
router
  .route('/')
  .get(protect, authorize('website_admin'), getWebsiteAdmins)
  .post(protect, authorize('website_admin'), createWebsiteAdmin);

router
  .route('/:id')
  .get(protect, authorize('website_admin'), getWebsiteAdminById)
  .put(protect, authorize('website_admin'), updateWebsiteAdmin)
  .delete(protect, authorize('website_admin'), deleteWebsiteAdmin);

router
  .route('/:id/permissions')
  .patch(protect, authorize('website_admin'), updateAdminPermissions);

module.exports = router;
