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
const upload = require('../middleware/upload');

const router = express.Router();

// Apply protection middleware to routes that need it
router.use(protect);
router.use(authorize('website_admin'));

router
  .route('/')
  .get(getWebsiteAdmins)
  .post(upload.single('photo'), createWebsiteAdmin);

router
  .route('/:id')
  .get(getWebsiteAdminById)
  .put(upload.single('photo'), updateWebsiteAdmin)
  .delete(deleteWebsiteAdmin);

// Public routes
router.post('/login', login);

module.exports = router;
