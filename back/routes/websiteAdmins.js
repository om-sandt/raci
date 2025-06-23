const express = require('express');
const {
  getWebsiteAdmins,
  getWebsiteAdminById,
  createWebsiteAdmin,
  updateWebsiteAdmin,
  deleteWebsiteAdmin,
  login
} = require('../controllers/websiteAdminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.use(protect);
router.use(authorize('website_admin'));

router
  .route('/')
  .get(getWebsiteAdmins)
  .post(createWebsiteAdmin);

router
  .route('/:id')
  .get(getWebsiteAdminById)
  .put(updateWebsiteAdmin)
  .delete(deleteWebsiteAdmin);

module.exports = router;
