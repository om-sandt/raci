const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const db = require('../config/db');
const logger = require('../utils/logger');

// Debug route to verify the route registration
router.get('/test', (req, res) => {
  console.log('RACI Tracker test route accessed');
  res.status(200).json({ success: true, message: 'RACI Tracker API is working' });
});

// Get my RACI assignments
router.get('/my-assignments', protect, async (req, res, next) => {
  try {
    console.log('RACI Tracker: Getting assignments for user', req.user.user_id);
    const userId = req.user.user_id;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * pageSize;

    // For testing initially, return empty data
    // This ensures route works even if DB queries fail
    return res.status(200).json({
      success: true,
      totalItems: 0,
      totalPages: 0,
      currentPage: page,
      data: []
    });

    // The following code can be uncommented once basic route works
    /*
    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM raci_assignments WHERE user_id = $1`,
      [userId]
    );
    
    const totalItems = parseInt(countResult.rows[0].count);
    console.log(`Found ${totalItems} RACI assignments for user ${userId}`);

    // Return early with empty data if no assignments
    if (totalItems === 0) {
      return res.status(200).json({
        success: true,
        totalItems: 0,
        totalPages: 0,
        currentPage: page,
        data: []
      });
    }

    // Get assignments with pagination
    const { rows } = await db.query(
      `SELECT ra.id, ra.type, ra.level, ra.financial_limit_min, ra.financial_limit_max,
              t.task_id, t.name as task_name, t.description as task_description,
              e.event_id, e.name as event_name, e.start_date, e.end_date,
              d.department_id, d.name as department_name
       FROM raci_assignments ra
       JOIN tasks t ON ra.task_id = t.task_id
       JOIN events e ON ra.event_id = e.event_id
       JOIN departments d ON e.department_id = d.department_id
       WHERE ra.user_id = $1
       ORDER BY ra.level, ra.id DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    const assignments = rows.map(row => ({
      id: row.id,
      type: row.type,
      level: row.level,
      financialLimits: row.financial_limit_min || row.financial_limit_max ? {
        min: row.financial_limit_min,
        max: row.financial_limit_max
      } : null,
      task: {
        id: row.task_id,
        name: row.task_name,
        description: row.task_description
      },
      event: {
        id: row.event_id,
        name: row.event_name,
        startDate: row.start_date,
        endDate: row.end_date
      },
      department: {
        id: row.department_id,
        name: row.department_name
      }
    }));

    res.status(200).json({
      success: true,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      currentPage: page,
      data: assignments
    });
    */
  } catch (error) {
    console.error('Error in RACI tracker /my-assignments:', error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve RACI assignments",
      error: error.message
    });
  }
});

/**
 * Get company-wide RACI assignments (for company admins only)
 */
router.get('/company', protect, authorize('company_admin'), async (req, res, next) => {
  try {
    console.log('RACI Tracker: Getting company assignments for company ID:', req.user.company_id);
    const companyId = req.user.company_id;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * pageSize;

    // Get total count of assignments in this company
    const countResult = await db.query(
      `SELECT COUNT(ra.id) 
       FROM raci_assignments ra
       JOIN users u ON ra.user_id = u.user_id
       WHERE u.company_id = $1`,
      [companyId]
    );
    const totalItems = parseInt(countResult.rows[0].count);

    // Return empty data if no assignments
    if (totalItems === 0) {
      return res.status(200).json({
        success: true,
        message: "No RACI assignments found for this company",
        totalItems: 0,
        totalPages: 0,
        currentPage: page,
        data: []
      });
    }

    // Get company RACI assignments with pagination
    const { rows } = await db.query(
      `SELECT ra.id, ra.type, ra.level, ra.user_id, ra.financial_limit_min, ra.financial_limit_max,
              u.full_name as user_name, u.email as user_email, u.role as user_role,
              t.task_id, t.name as task_name, t.description as task_description,
              e.event_id, e.name as event_name, e.start_date, e.end_date, e.status as event_status,
              d.department_id, d.name as department_name
       FROM raci_assignments ra
       JOIN users u ON ra.user_id = u.user_id
       JOIN tasks t ON ra.task_id = t.task_id
       JOIN events e ON ra.event_id = e.event_id
       JOIN departments d ON e.department_id = d.department_id
       WHERE u.company_id = $1
       ORDER BY ra.level, ra.id DESC
       LIMIT $2 OFFSET $3`,
      [companyId, pageSize, offset]
    );

    // Format the response
    const assignments = rows.map(row => ({
      id: row.id,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        role: row.user_role
      },
      type: row.type,
      level: row.level,
      financialLimits: row.financial_limit_min || row.financial_limit_max ? {
        min: row.financial_limit_min,
        max: row.financial_limit_max
      } : null,
      task: {
        id: row.task_id,
        name: row.task_name,
        description: row.task_description
      },
      event: {
        id: row.event_id,
        name: row.event_name,
        status: row.event_status,
        startDate: row.start_date,
        endDate: row.end_date
      },
      department: {
        id: row.department_id,
        name: row.department_name
      }
    }));

    res.status(200).json({
      success: true,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      currentPage: page,
      data: assignments
    });
  } catch (error) {
    console.error('RACI Company Tracker API Error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve company RACI assignments",
      error: error.message
    });
  }
});

// Basic redirect for the root path
router.get('/', protect, (req, res) => {
  if (req.user.role === 'company_admin') {
    return res.redirect('/api/raci-tracker/company');
  }
  res.status(403).json({
    success: false,
    message: 'Access denied. Only company admins can access this resource.'
  });
});

module.exports = router;
