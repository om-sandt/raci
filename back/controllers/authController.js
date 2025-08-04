const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const { generateOTP, verifyOTP } = require('../utils/otpUtils');
const { generateS3Url } = require('../utils/s3Utils');
const logger = require('../utils/logger');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const { rows } = await db.query(
      'SELECT user_id, full_name, email, password, role, company_id, department_id, is_default_password FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = rows[0];

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get company info if the user has a company
    let company = null;
    if (user.company_id) {
      const companyResult = await db.query(
        'SELECT company_id, name FROM companies WHERE company_id = $1',
        [user.company_id]
      );
      
      if (companyResult.rows.length > 0) {
        company = {
          id: companyResult.rows[0].company_id,
          name: companyResult.rows[0].name
        };
      }
    }

    // Generate tokens
    const token = generateToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    res.status(200).json({
      token,
      refreshToken,
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        company,
        isDefaultPassword: user.is_default_password // Include this flag in the response
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change default password
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const { rows } = await db.query(
      'SELECT user_id, password, is_default_password FROM users WHERE user_id = $1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = rows[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and set is_default_password to false
    await db.query(
      'UPDATE users SET password = $1, is_default_password = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const { rows } = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, 
      u.company_id, u.department_id, u.designation, u.employee_id, u.photo
      FROM users u WHERE u.user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = rows[0];

    // Get company details
    let company = null;
    if (user.company_id) {
      const companyResult = await db.query(
        'SELECT company_id, name FROM companies WHERE company_id = $1',
        [user.company_id]
      );
      
      if (companyResult.rows.length > 0) {
        company = {
          id: companyResult.rows[0].company_id,
          name: companyResult.rows[0].name
        };
      }
    }

    res.status(200).json({
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      company,
      designation: user.designation,
      phone: user.phone,
      employeeId: user.employee_id,
      photo: generateS3Url(user.photo)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      
      // Generate new access token
      const newToken = generateToken(decoded.id);
      
      res.status(200).json({
        token: newToken
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  // In a stateless JWT system, we don't need to do anything server-side
  // The client should remove the token from storage
  
  const { TOKEN_NAME, REFRESH_TOKEN_NAME } = require('../utils/tokenValidator');
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    clearTokens: true, // Signal to frontend to remove tokens
    tokenKeys: {
      accessToken: TOKEN_NAME,
      refreshToken: REFRESH_TOKEN_NAME
    }
  });
};

// @desc    Request password reset (forgot password)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    // Check if user exists
    const { rows } = await db.query(
      'SELECT user_id, email FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }

    // Generate OTP
    const otp = generateOTP(email);

    // TODO: Send OTP via email
    logger.info(`OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email address',
      // For development purposes only - remove in production
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    // Verify OTP
    const isValid = verifyOTP(email, otp);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Generate a temporary token for password reset
    const resetToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using reset token
// @route   POST /api/auth/reset-password
// @access  Public (with reset token)
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide reset token and new password'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Get user by email
    const { rows } = await db.query(
      'SELECT user_id FROM users WHERE email = $1',
      [decoded.email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userId = rows[0].user_id;

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.query(
      'UPDATE users SET password = $1, is_default_password = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};
