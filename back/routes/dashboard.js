const express = require('express');
const {
  getWebsiteAdminDashboard,
  getCompanyAdminDashboard,
  getHodDashboard,
  getUserDashboard
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

router.get('/website-admin', authorize('website_admin'), getWebsiteAdminDashboard);
router.get('/company-admin', authorize('company_admin', 'website_admin'), getCompanyAdminDashboard);
router.get('/hod', authorize('hod'), getHodDashboard);
router.get('/user', getUserDashboard);

// RACI dashboard
router.get('/raci', authorize('company_admin', 'hod'), (req, res) => {
  res.status(501).json({
    success: false,
    message: 'RACI dashboard not yet implemented'
  });
});

module.exports = router;
