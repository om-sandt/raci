const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Get the RACI assignments for the currently logged in user
 */
const getMyRaciAssignments = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Get user details
    const userResult = await db.query(
      'SELECT user_id, full_name, email, department_id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Get department details
    const departmentResult = await db.query(
      'SELECT department_id, name FROM departments WHERE department_id = $1',
      [user.department_id]
    );

    const department = departmentResult.rows.length > 0 ? {
      id: departmentResult.rows[0].department_id,
      name: departmentResult.rows[0].name
    } : null;

    // Get RACI assignments for user with task and event details
    const raciQuery = `
      SELECT 
        ra.raci_id, ra.type as role, ra.financial_limit_min, ra.financial_limit_max,
        t.task_id, t.name as task_name, t.description as task_description,
        e.event_id, e.name as event_name, e.created_at as event_start_date,
        e.updated_at as event_end_date
      FROM raci_assignments ra
      JOIN tasks t ON ra.task_id = t.task_id
      JOIN events e ON t.event_id = e.event_id
      WHERE ra.user_id = $1
      ORDER BY e.created_at DESC, t.task_id ASC
    `;
    
    const raciResult = await db.query(raciQuery, [userId]);
    
    // Format RACI assignments
    const raciAssignments = raciResult.rows.map(row => ({
      id: row.raci_id,
      role: row.role,
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
        startDate: row.event_start_date,
        endDate: row.event_end_date
      }
    }));
    
    logger.info(`Retrieved ${raciAssignments.length} RACI assignments for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          name: user.full_name,
          email: user.email
        },
        department,
        raciAssignments
      }
    });
  } catch (error) {
    logger.error(`Error getting user RACI assignments: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getMyRaciAssignments,
};
