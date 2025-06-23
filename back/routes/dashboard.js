const express = require('express');
const {
  getCompanyAdminDashboard,
  getHodDashboard,
  getUserDashboard
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

router.get('/company-admin', authorize('company_admin'), getCompanyAdminDashboard);
router.get('/hod', authorize('hod'), getHodDashboard);
router.get('/user', getUserDashboard);

module.exports = router;
router.get('/company-admin', authorize('company_admin'), (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Company admin dashboard not yet implemented'
  });
});

// User dashboard
router.get('/user', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'User dashboard not yet implemented'
  });
});

// RACI dashboard
router.get('/raci', authorize('company_admin', 'hod'), (req, res) => {
  res.status(501).json({
    success: false,
    message: 'RACI dashboard not yet implemented'
  });
});

module.exports = router;
