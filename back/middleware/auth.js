const jwt = require('jsonwebtoken');
const db = require('../config/db');
const logger = require('../utils/logger');

// Middleware to protect routes that require authentication
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
    
    // Log the token for debugging (don't do this in production)
    logger.debug(`Token received: ${token.substring(0, 20)}...`);
  }

  // Check if token exists
  if (!token) {
    logger.warn('No token provided in request');
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug(`Token decoded successfully for ID: ${decoded.id}`);

    // First check if this is a website admin
    const adminResult = await db.query(
      'SELECT admin_id, full_name, email, phone FROM website_admins WHERE admin_id = $1',
      [decoded.id]
    );

    if (adminResult.rows.length > 0) {
      // This is a website admin
      req.user = {
        admin_id: adminResult.rows[0].admin_id,
        user_id: adminResult.rows[0].admin_id, // Keep for backwards compatibility
        full_name: adminResult.rows[0].full_name,
        email: adminResult.rows[0].email,
        role: 'website_admin',
        phone: adminResult.rows[0].phone
      };
      logger.debug(`Request authorized as website admin: ${req.user.email}`);
      return next();
    }

    // If not a website admin, check if it's a regular user
    const userResult = await db.query(
      'SELECT user_id, full_name, email, role, company_id, department_id, photo FROM users WHERE user_id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      logger.warn(`User ID ${decoded.id} not found in database`);
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    // Add user to request object
    req.user = userResult.rows[0];
    logger.debug(`Request authorized as ${req.user.role}: ${req.user.email}`);
    next();
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Middleware for authorization based on roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied: ${req.user.role} tried to access route requiring ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    logger.debug(`Role authorization successful for ${req.user.role}`);
    next();
  };
};

// Check if user belongs to company
exports.checkCompanyMember = async (req, res, next) => {
  // Support both named route params (:companyId) and generic :id in routes
  const companyId = req.params.companyId || req.params.id;
  
  // Log values for debugging
  logger.debug(`Checking company access: User company: ${req.user.company_id}, URL company: ${companyId}`);

  if (req.user.role === 'website_admin') {
    // Website admins can access all companies
    logger.debug('User is website_admin, allowing access to any company');
    return next();
  }

  // Check if user is part of the company
  if (!companyId || req.user.company_id.toString() !== companyId.toString()) {
    logger.warn(`User from company ${req.user.company_id} tried to access resources for company ${companyId}`);
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access resources for this company'
    });
  }

  logger.debug('User belongs to the company, access granted');
  next();
};


