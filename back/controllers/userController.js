const bcrypt = require('bcryptjs');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { generateS3Url, deleteFileFromS3, extractS3Key } = require('../utils/s3Utils');

// @desc    Create a new user
// @route   POST /api/users
// @access  Private (company-admin or website-admin)
exports.createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      role,
      designation,
      division,
      phone,
      employeeId,
      departmentId,
      companyId,
      location,
      dob, // <-- added
      doj  // <-- added
    } = req.body;

    // Validate inputs
    if (!email || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and role are required'
      });
    }

    // Check if user with this email already exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate department exists for the company
    if (departmentId) {
      const departmentCheck = await db.query(
        'SELECT * FROM departments WHERE department_id = $1 AND company_id = $2',
        [departmentId, companyId]
      );

      if (departmentCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Department with ID ${departmentId} does not exist for this company. Available departments: Please run the setupDepartments.js script.`
        });
      }
    }

    // Validate role
    const allowedRoles = ['user', 'company_admin', 'hod'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Generate random password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Handle photo upload if provided (for company_admin)
    let photoUrl = null;
    if (req.file && role === 'company_admin') {
      photoUrl = req.file.key;
    }

    // Insert new user
    const result = await db.query(
      `INSERT INTO users (full_name, email, password, role, designation, division, phone, 
        employee_id, department_id, company_id, photo, location, dob, doj)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING user_id, full_name, email, role, designation, division, phone, employee_id, department_id, company_id, photo, location, dob, doj, created_at, updated_at`,
      [name, email, hashedPassword, role, designation, division, phone, employeeId, departmentId, companyId, photoUrl, location, dob, doj]
    );

    const user = result.rows[0];

    // Get department and company info
    let department = null;
    if (user.department_id) {
      const deptResult = await db.query(
        'SELECT department_id, name FROM departments WHERE department_id = $1',
        [user.department_id]
      );
      
      if (deptResult.rows.length > 0) {
        department = {
          id: deptResult.rows[0].department_id,
          name: deptResult.rows[0].name
        };
      }
    }

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

    // TODO: Send email with temporary password
    // For now, we're returning it in the response

    res.status(201).json({
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      division: user.division,
      phone: user.phone,
      employeeId: user.employee_id,
      photo: generateS3Url(user.photo),
      location: user.location,
      dob: user.dob, // <-- added
      doj: user.doj, // <-- added
      department,
      company,
      status: 'pending',
      tempPassword: tempPassword,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`);
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (company-admin or website-admin)
exports.getUsers = async (req, res, next) => {
  try {
    const {
      companyId,
      departmentId,
      role,
      status,
      page = 1,
      limit = 10
    } = req.query;

    // Build query based on filters
    let query = `SELECT u.user_id, u.full_name, u.email, u.role, u.designation, u.division,
                u.phone, u.employee_id, u.photo, u.department_id, d.name as department_name, 
                u.company_id, c.name as company_name, u.created_at, u.updated_at, u.location, u.dob, u.doj
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.department_id
                LEFT JOIN companies c ON u.company_id = c.company_id
                WHERE 1=1`;
    
    const queryParams = [];
    let paramIndex = 1;

    if (companyId) {
      query += ` AND u.company_id = $${paramIndex++}`;
      queryParams.push(companyId);
    }

    if (departmentId) {
      query += ` AND u.department_id = $${paramIndex++}`;
      queryParams.push(departmentId);
    }

    if (role) {
      query += ` AND u.role = $${paramIndex++}`;
      queryParams.push(role);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    // Execute query
    const { rows } = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM users u WHERE 1=1`;
    let countParams = [];
    let countParamIndex = 1;

    if (companyId) {
      countQuery += ` AND u.company_id = $${countParamIndex++}`;
      countParams.push(companyId);
    }

    if (departmentId) {
      countQuery += ` AND u.department_id = $${countParamIndex++}`;
      countParams.push(departmentId);
    }

    if (role) {
      countQuery += ` AND u.role = $${countParamIndex++}`;
      countParams.push(role);
    }

    const countResult = await db.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Format the response
    const users = rows.map(user => ({
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      division: user.division,
      phone: user.phone,
      employeeId: user.employee_id,
      photo: generateS3Url(user.photo),
      location: user.location,
      dob: user.dob, // <-- added
      doj: user.doj, // <-- added
      department: user.department_id ? {
        id: user.department_id,
        name: user.department_name
      } : null,
      company: user.company_id ? {
        id: user.company_id,
        name: user.company_name
      } : null,
      status: 'active',
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    res.status(200).json({
      totalItems,
      totalPages,
      currentPage: parseInt(page),
      users
    });
  } catch (error) {
    logger.error(`Error in getUsers: ${error.message}`);
    logger.error(error.stack);
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const { rows } = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, 
      u.designation, u.division, u.employee_id, u.company_id, u.department_id, u.photo, u.location, u.dob, u.doj,
      u.created_at, u.updated_at,
      c.name as company_name, d.name as department_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.company_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = rows[0];

    res.status(200).json({
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      division: user.division,
      phone: user.phone,
      employeeId: user.employee_id,
      photo: generateS3Url(user.photo),
      location: user.location,
      dob: user.dob, // <-- added
      doj: user.doj, // <-- added
      department: user.department_id ? {
        id: user.department_id,
        name: user.department_name
      } : null,
      company: user.company_id ? {
        id: user.company_id,
        name: user.company_name
      } : null,
      status: 'active',
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (self, company-admin or website-admin)
exports.updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { name, designation, division, phone, departmentId, location, dob, doj } = req.body;

    // Check if user exists
    const userCheck = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Authorization check: Only allow self, company admins, or website admins
    const isSelf = req.user.user_id === parseInt(userId);
    const isCompanyAdmin = req.user.role === 'company_admin' && 
                           req.user.company_id === userCheck.rows[0].company_id;
    const isWebsiteAdmin = req.user.role === 'website_admin';
    
    if (!isSelf && !isCompanyAdmin && !isWebsiteAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Handle photo upload if provided (for company_admin)
    let photoUrl = userCheck.rows[0].photo;
    if (req.file && userCheck.rows[0].role === 'company_admin') {
      // If user already has a photo, remove the old one from S3
      if (photoUrl) {
        try {
          const s3Key = extractS3Key(photoUrl);
          if (s3Key) {
            await deleteFileFromS3(s3Key);
          }
        } catch (error) {
          console.error('Error deleting old photo from S3:', error);
        }
      }
      photoUrl = req.file.key;
    }

    // Update user
    const result = await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           designation = COALESCE($2, designation),
           division = COALESCE($3, division),
           phone = COALESCE($4, phone),
           department_id = COALESCE($5, department_id),
           photo = COALESCE($6, photo),
           location = COALESCE($7, location),
           dob = COALESCE($8, dob),
           doj = COALESCE($9, doj),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $10
       RETURNING user_id, full_name, email, role, designation, division, phone, employee_id, department_id, company_id, photo, location, dob, doj, created_at, updated_at`,
      [name, designation, division, phone, departmentId, photoUrl, location, dob, doj, userId]
    );

    const user = result.rows[0];

    // Get department and company info
    let department = null;
    if (user.department_id) {
      const deptResult = await db.query(
        'SELECT department_id, name FROM departments WHERE department_id = $1',
        [user.department_id]
      );
      
      if (deptResult.rows.length > 0) {
        department = {
          id: deptResult.rows[0].department_id,
          name: deptResult.rows[0].name
        };
      }
    }

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
      designation: user.designation,
      division: user.division,
      phone: user.phone,
      employeeId: user.employee_id,
      photo: generateS3Url(user.photo),
      location: user.location,
      dob: user.dob, // <-- added
      doj: user.doj, // <-- added
      department,
      company,
      status: 'active',
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (company-admin or website-admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const userCheck = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user
    await db.query('DELETE FROM users WHERE user_id = $1', [userId]);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
