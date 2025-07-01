const express = require('express');
const { 
  login, 
  getMe, 
  refreshToken, 
  logout,
  changePassword,
  forgotPassword,
  verifyOTP,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Password management routes
router.post('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// GET /api/auth/current-user
router.get('/current-user', protect, async (req, res) => {
  // You may want to fetch more user info from DB if needed
  res.status(200).json({
    success: true,
    user: {
      id: req.user.user_id,
      name: req.user.full_name,
      email: req.user.email,
      role: req.user.role,
      companyId: req.user.company_id,
      // add more fields if needed
    }
  });
});

module.exports = router;
