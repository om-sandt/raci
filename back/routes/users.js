const express = require('express');
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

router
  .route('/')
  .get(authorize('company_admin', 'website_admin'), getUsers)
  .post(authorize('company_admin', 'website_admin'), upload.single('photo'), createUser);

router
  .route('/:id')
  .get(getUserById)
  .put(upload.single('photo'), updateUser)
  .delete(authorize('company_admin', 'website_admin'), deleteUser);

module.exports = router;
