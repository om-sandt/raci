const db = require('../config/db');
const logger = require('../utils/logger');

// Helper to store financial limits as JSON in the DB
function serializeFinancialLimits(financialLimits) {
  return financialLimits ? JSON.stringify(financialLimits) : null;
}

function deserializeFinancialLimits(financialLimits) {
  if (!financialLimits) return null;
  try {
    return JSON.parse(financialLimits);
  } catch (e) {
    console.error('Error parsing financial limits:', e);
    return null;
  }
}

// @desc    Create a new RACI matrix
// @route   POST /api/raci-matrices
// @access  Private (company_admin or hod)
exports.createRaciMatrix = async (req, res, next) => {
  try {
    const { eventId, taskAssignments } = req.body;
    
    // Check if event exists
    const eventCheck = await db.query(
      'SELECT e.*, d.name as department_name FROM events e JOIN departments d ON e.department_id = d.department_id WHERE e.event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const event = eventCheck.rows[0];
    
    // Check for authorization - must be company admin or HOD of the department
    const isHod = req.user.user_id === event.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin';
    
    if (!isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create RACI matrix for this event'
      });
    }
    
    // Start a transaction to ensure data consistency
    await db.query('BEGIN');
    
    const processedTasks = [];
    
    // Process each task assignment
    for (const assignment of taskAssignments) {
      const { taskId, responsible, accountable, consulted, informed, financialLimits, levels } = assignment;
      
      // Verify task exists and belongs to the event
      const taskCheck = await db.query(
        'SELECT * FROM tasks WHERE task_id = $1 AND event_id = $2',
        [taskId, eventId]
      );
      
      if (taskCheck.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Task ID ${taskId} not found for this event`
        });
      }
      
      const task = taskCheck.rows[0];
      logger.debug(`Processing RACI assignments for task ${task.name} (ID: ${task.task_id})`);
      
      // Clear any existing RACI assignments for this task
      await db.query(
        'DELETE FROM raci_assignments WHERE task_id = $1',
        [taskId]
      );
      
      // Process responsible users (R)
      if (Array.isArray(responsible)) {
        for (const userId of responsible) {
          // Extract financial limits for this specific responsible user
          let userFinancialLimits = null;
          const financialLimitKey = `task-${taskId}-responsible-${userId}`;
          
          if (financialLimits && financialLimits[financialLimitKey]) {
            userFinancialLimits = financialLimits[financialLimitKey];
            logger.info(`Found financial limits for ${financialLimitKey}: ${JSON.stringify(userFinancialLimits)}`);
          }
          
          // Extract level for this specific responsible user
          let userLevel = 1;
          const levelKey = `task-${taskId}-responsible-${userId}`;
          if (levels && levels[levelKey]) {
            userLevel = parseInt(levels[levelKey]) || 1;
          }
          
          // Use the extracted financial limits and level
          await createRaciAssignment(eventId, taskId, 'R', userId, userFinancialLimits, userLevel);
        }
      }
      
      // Process accountable users (A)
      if (Array.isArray(accountable)) {
        for (const userId of accountable) {
          // Extract financial limits for accountable users if provided
          let userFinancialLimits = null;
          if (financialLimits && financialLimits[`task-${taskId}-accountable-${userId}`]) {
            userFinancialLimits = financialLimits[`task-${taskId}-accountable-${userId}`];
          }
          
          // Extract level for this specific accountable user
          let userLevel = 1;
          const levelKey = `task-${taskId}-accountable-${userId}`;
          if (levels && levels[levelKey]) {
            userLevel = parseInt(levels[levelKey]) || 1;
          }
          
          await createRaciAssignment(eventId, taskId, 'A', userId, userFinancialLimits, userLevel);
        }
      }
      
      // Process consulted users (C)
      if (Array.isArray(consulted)) {
        for (const userId of consulted) {
          // Extract financial limits for consulted users if provided
          let userFinancialLimits = null;
          if (financialLimits && financialLimits[`task-${taskId}-consulted-${userId}`]) {
            userFinancialLimits = financialLimits[`task-${taskId}-consulted-${userId}`];
          }
          
          // Extract level for this specific consulted user
          let userLevel = 1;
          const levelKey = `task-${taskId}-consulted-${userId}`;
          if (levels && levels[levelKey]) {
            userLevel = parseInt(levels[levelKey]) || 1;
          }
          
          await createRaciAssignment(eventId, taskId, 'C', userId, userFinancialLimits, userLevel);
        }
      }
      
      // Process informed users (I)
      if (Array.isArray(informed)) {
        for (const userId of informed) {
          // Extract financial limits for informed users if provided
          let userFinancialLimits = null;
          if (financialLimits && financialLimits[`task-${taskId}-informed-${userId}`]) {
            userFinancialLimits = financialLimits[`task-${taskId}-informed-${userId}`];
          }
          
          // Extract level for this specific informed user
          let userLevel = 1;
          const levelKey = `task-${taskId}-informed-${userId}`;
          if (levels && levels[levelKey]) {
            userLevel = parseInt(levels[levelKey]) || 1;
          }
          
          await createRaciAssignment(eventId, taskId, 'I', userId, userFinancialLimits, userLevel);
        }
      }
      
      processedTasks.push({
        id: task.task_id,
        name: task.name,
        responsibleCount: responsible ? responsible.length : 0,
        accountableCount: accountable ? accountable.length : 0,
        consultedCount: consulted ? consulted.length : 0,
        informedCount: informed ? informed.length : 0
      });
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    logger.info(`RACI matrix created for event ${eventId} with ${processedTasks.length} tasks`);
    
    res.status(201).json({
      success: true,
      eventId,
      eventName: event.name,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      tasks: processedTasks
    });
  } catch (error) {
    // Rollback the transaction on error
    await db.query('ROLLBACK');
    logger.error(`Error creating RACI matrix: ${error.message}`);
    next(error);
  }
};

// Helper function to create RACI assignment
async function createRaciAssignment(eventId, taskId, type, userId, financialLimits = null, level = 1) {
  let financialLimitMin = null;
  let financialLimitMax = null;
  
  if (financialLimits) {
    // Check if min value exists and is a valid number
    if (financialLimits.min !== undefined && financialLimits.min !== null) {
      const parsedMin = parseFloat(financialLimits.min);
      if (!isNaN(parsedMin)) {
        financialLimitMin = parsedMin;
      }
    }
    
    // Check if max value exists and is a valid number
    if (financialLimits.max !== undefined && financialLimits.max !== null) {
      const parsedMax = parseFloat(financialLimits.max);
      if (!isNaN(parsedMax)) {
        financialLimitMax = parsedMax;
      }
    }
  }
  
  // Ensure level is a valid integer
  const assignmentLevel = parseInt(level) || 1;
  
  // Log explicit values for debugging
  logger.info(`Setting assignment for user ${userId}, task ${taskId}, type ${type}, level ${assignmentLevel}: min=${financialLimitMin}, max=${financialLimitMax}`);
  logger.info(`Financial limit input: ${JSON.stringify(financialLimits)}`);
  
  try {
    const result = await db.query(
      `INSERT INTO raci_assignments 
       (event_id, task_id, type, user_id, level, financial_limit_min, financial_limit_max)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING raci_id, level, financial_limit_min, financial_limit_max`,
      [eventId, taskId, type, userId, assignmentLevel, financialLimitMin, financialLimitMax]
    );
    
    // Log what was actually saved in the database
    const savedRow = result.rows[0];
    logger.info(`Saved assignment in DB: level=${savedRow.level}, min=${savedRow.financial_limit_min}, max=${savedRow.financial_limit_max}`);
    
    return savedRow.raci_id;
  } catch (error) {
    logger.error(`Failed to create RACI assignment: ${error.message}`);
    throw error;
  }
}

// @desc    Get RACI matrix by event ID
// @route   GET /api/events/:eventId/raci-matrix
// @access  Private (company member)
exports.getRaciMatrixByEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    // Get event details
    const eventResult = await db.query(
      `SELECT e.*, d.name as department_name 
       FROM events e 
       JOIN departments d ON e.department_id = d.department_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const event = eventResult.rows[0];
    
    // Get all tasks for this event
    const tasksResult = await db.query(
      `SELECT * FROM tasks WHERE event_id = $1 ORDER BY created_at`,
      [eventId]
    );
    
    const tasks = [];
    
    // For each task, get RACI assignments
    for (const task of tasksResult.rows) {
      // Get RACI assignments for this task
      const raciResult = await db.query(
        `SELECT ra.*, u.full_name, u.email, u.role, u.designation 
         FROM raci_assignments ra
         JOIN users u ON ra.user_id = u.user_id
         WHERE ra.event_id = $1 AND ra.task_id = $2
         ORDER BY ra.level, ra.type, u.full_name`,
        [eventId, task.task_id]
      );
      
      // Organize by RACI type
      const responsible = [];
      const accountable = [];
      const consulted = [];
      const informed = [];
      
      raciResult.rows.forEach(row => {
        const userData = {
          id: row.user_id,
          name: row.full_name,
          email: row.email,
          role: row.role,
          designation: row.designation,
          level: row.level,
          financialLimits: row.financial_limit_min || row.financial_limit_max ? {
            min: row.financial_limit_min,
            max: row.financial_limit_max
          } : null
        };
        
        switch(row.type) {
          case 'R': responsible.push(userData); break;
          case 'A': accountable.push(userData); break;
          case 'C': consulted.push(userData); break;
          case 'I': informed.push(userData); break;
        }
      });
      
      tasks.push({
        id: task.task_id,
        name: task.name,
        description: task.description,
        status: task.status,
        raci: {
          responsible,
          accountable,
          consulted,
          informed
        }
      });
    }
    
    // Get approval status for this event
    let approvalStatus = null;
    let approvalSummary = null;
    
    // Check if there are any approval records for this event
    const approvalCheck = await db.query(
      `SELECT COUNT(*) as approval_count
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
       WHERE rac.event_id = $1`,
      [eventId]
    );
    
    const hasApprovals = parseInt(approvalCheck.rows[0].approval_count) > 0;
    
    if (hasApprovals) {
      // Get detailed approval status
      const approvalStatusQuery = await db.query(
        `SELECT ra.approval_level, ra.status, COUNT(*) as count,
                u.full_name as approver_name, u.email as approver_email,
                MAX(ra.updated_at) as last_updated,
                CASE 
                  WHEN ra.status != 'PENDING' THEN MAX(ra.reason)
                  ELSE NULL 
                END as reason
         FROM raci_approvals ra
         JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
         JOIN users u ON ra.approved_by = u.user_id
         WHERE rac.event_id = $1
         GROUP BY ra.approval_level, ra.status, u.full_name, u.email
         ORDER BY ra.approval_level, ra.status`,
        [eventId]
      );
      
      // Calculate overall status
      const totalApprovals = await db.query(
        `SELECT COUNT(*) as total_count,
                SUM(CASE WHEN ra.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN ra.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN ra.status = 'PENDING' THEN 1 ELSE 0 END) as pending_count
         FROM raci_approvals ra
         JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
         WHERE rac.event_id = $1`,
        [eventId]
      );
      
      const statusCounts = totalApprovals.rows[0];
      const totalCount = parseInt(statusCounts.total_count);
      const approvedCount = parseInt(statusCounts.approved_count);
      const rejectedCount = parseInt(statusCounts.rejected_count);
      const pendingCount = parseInt(statusCounts.pending_count);
      
      // Determine overall status
      let overallStatus = 'PENDING';
      if (rejectedCount > 0) {
        overallStatus = 'REJECTED';
      } else if (approvedCount === totalCount) {
        overallStatus = 'APPROVED';
      }
      
      approvalStatus = {
        overall: overallStatus,
        total: totalCount,
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount
      };
      
      approvalSummary = approvalStatusQuery.rows;
    }
    
    res.status(200).json({
      eventId: event.event_id,
      name: event.name,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      tasks,
      approvalStatus,
      approvalSummary,
      hasApprovals
    });
  } catch (error) {
    logger.error(`Error getting RACI matrix: ${error.message}`);
    next(error);
  }
};

// @desc    Update RACI matrix
// @route   PUT /api/raci-matrices/:id
// @access  Private (matrix creator, company_admin)
exports.updateRaciMatrix = async (req, res, next) => {
  try {
    const { eventId, taskAssignments } = req.body;
    
    // Check if event exists
    const eventCheck = await db.query(
      'SELECT e.*, d.name as department_name FROM events e JOIN departments d ON e.department_id = d.department_id WHERE e.event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const event = eventCheck.rows[0];
    
    // Check for authorization - must be company admin or HOD of the department
    const isHod = req.user.user_id === event.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin';
    
    if (!isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update RACI matrix for this event'
      });
    }
    
    // Start a transaction to ensure data consistency
    await db.query('BEGIN');
    
    const processedTasks = [];
    
    // Process each task assignment
    for (const assignment of taskAssignments) {
      const { taskId, responsible, accountable, consulted, informed, financialLimits, levels } = assignment;
      
      // Verify task exists and belongs to the event
      const taskCheck = await db.query(
        'SELECT * FROM tasks WHERE task_id = $1 AND event_id = $2',
        [taskId, eventId]
      );
      
      if (taskCheck.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Task ID ${taskId} not found for this event`
        });
      }
      
      const task = taskCheck.rows[0];
      logger.debug(`Updating RACI assignments for task ${task.name} (ID: ${task.task_id})`);
      
      // Clear any existing RACI assignments for this task
      await db.query(
        'DELETE FROM raci_assignments WHERE task_id = $1',
        [taskId]
      );
      
      // Process responsible users (R)
      if (Array.isArray(responsible)) {
        for (const userId of responsible) {
          // Extract financial limits for this specific responsible user
          let userFinancialLimits = null;
          const financialLimitKey = `task-${taskId}-responsible-${userId}`;
          
          if (financialLimits && financialLimits[financialLimitKey]) {
            userFinancialLimits = financialLimits[financialLimitKey];
            logger.info(`Found financial limits for ${financialLimitKey}: ${JSON.stringify(userFinancialLimits)}`);
          }
          
          // Extract level for this specific responsible user
          let userLevel = 1;
          const levelKey = `task-${taskId}-responsible-${userId}`;
          if (levels && levels[levelKey]) {
            userLevel = parseInt(levels[levelKey]) || 1;
          }
          
          // Use the extracted financial limits and level
          await createRaciAssignment(eventId, taskId, 'R', userId, userFinancialLimits, userLevel);
        }
      }
      
      // Process accountable users (A)
      if (Array.isArray(accountable)) {
        for (const userId of accountable) {
          // Extract financial limits for accountable users if provided
          let userFinancialLimits = null;
          if (financialLimits && financialLimits[`task-${taskId}-accountable-${userId}`]) {
            userFinancialLimits = financialLimits[`task-${taskId}-accountable-${userId}`];
          }
          
          // Extract level for this specific accountable user
          let userLevel = 1;
          const levelKey = `task-${taskId}-accountable-${userId}`;
          if (levels && levels[levelKey]) {
            userLevel = parseInt(levels[levelKey]) || 1;
          }
          
          await createRaciAssignment(eventId, taskId, 'A', userId, userFinancialLimits, userLevel);
        }
      }
      
      // Process consulted users (C)
      if (Array.isArray(consulted)) {
        for (const userId of consulted) {
          // Extract financial limits for consulted users if provided
          let userFinancialLimits = null;
          if (financialLimits && financialLimits[`task-${taskId}-consulted-${userId}`]) {
            userFinancialLimits = financialLimits[`task-${taskId}-consulted-${userId}`];
          }
          
          // Extract level for this specific consulted user
          let userLevel = 1;
          const levelKey = `task-${taskId}-consulted-${userId}`;
          if (levels && levels[levelKey]) {
            userLevel = parseInt(levels[levelKey]) || 1;
          }
          
          await createRaciAssignment(eventId, taskId, 'C', userId, userFinancialLimits, userLevel);
        }
      }
      
      // Process informed users (I)
      if (Array.isArray(informed)) {
        for (const userId of informed) {
          // Extract financial limits for informed users if provided
          let userFinancialLimits = null;
          if (financialLimits && financialLimits[`task-${taskId}-informed-${userId}`]) {
            userFinancialLimits = financialLimits[`task-${taskId}-informed-${userId}`];
          }
          
          // Extract level for this specific informed user
          let userLevel = 1;
          const levelKey = `task-${taskId}-informed-${userId}`;
          if (levels && levels[levelKey]) {
            userLevel = parseInt(levels[levelKey]) || 1;
          }
          
          await createRaciAssignment(eventId, taskId, 'I', userId, userFinancialLimits, userLevel);
        }
      }
      
      processedTasks.push({
        id: task.task_id,
        name: task.name,
        responsibleCount: responsible ? responsible.length : 0,
        accountableCount: accountable ? accountable.length : 0,
        consultedCount: consulted ? consulted.length : 0,
        informedCount: informed ? informed.length : 0
      });
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    logger.info(`RACI matrix updated for event ${eventId} with ${processedTasks.length} tasks`);
    
    res.status(200).json({
      success: true,
      message: "RACI matrix updated successfully",
      eventId,
      eventName: event.name,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      tasks: processedTasks
    });
  } catch (error) {
    // Rollback the transaction on error
    await db.query('ROLLBACK');
    logger.error(`Error updating RACI matrix: ${error.message}`);
    next(error);
  }
};

// @desc    Delete RACI matrix
// @route   DELETE /api/raci-matrices/:id
// @access  Private (matrix creator, company_admin)
exports.deleteRaciMatrix = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    
    // Check if event exists and has RACI assignments
    const eventCheck = await db.query(
      `SELECT e.*, d.name as department_name, d.company_id 
       FROM events e 
       JOIN departments d ON e.department_id = d.department_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const event = eventCheck.rows[0];
    
    // Check for authorization - must be company admin or HOD of the department
    const isHod = req.user.user_id === event.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin' && 
                          req.user.company_id === event.company_id;
    
    if (!isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete RACI matrix for this event'
      });
    }
    
    // Check if there are RACI assignments for this event
    const raciAssignmentsCheck = await db.query(
      `SELECT COUNT(*) FROM raci_assignments ra
       JOIN tasks t ON ra.task_id = t.task_id
       WHERE t.event_id = $1`,
      [eventId]
    );
    
    const assignmentCount = parseInt(raciAssignmentsCheck.rows[0].count);
    
    if (assignmentCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No RACI matrix found for this event'
      });
    }
    
    // Delete all RACI assignments for this event
    await db.query(
      `DELETE FROM raci_assignments
       WHERE task_id IN (SELECT task_id FROM tasks WHERE event_id = $1)`,
      [eventId]
    );
    
    logger.info(`RACI matrix deleted for event ${eventId}`);
    
    res.status(200).json({
      success: true,
      message: 'RACI matrix deleted successfully',
      eventId,
      eventName: event.name
    });
  } catch (error) {
    logger.error(`Error deleting RACI matrix: ${error.message}`);
    next(error);
  }
};

// @desc    Get RACI Tracker for current user
// @route   GET /api/raci-tracker/my-assignments
// @access  Private (any user)
exports.getMyRaciAssignments = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM raci_assignments WHERE user_id = $1`,
      [userId]
    );
    const totalItems = parseInt(countResult.rows[0].count);

    // If no assignments found, return empty array
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
      `SELECT ra.id, ra.role, ra.financial_limits, 
              t.task_id, t.name as task_name, t.description as task_description,
              e.event_id, e.name as event_name, e.start_date, e.end_date,
              d.department_id, d.name as department_name
       FROM raci_assignments ra
       JOIN tasks t ON ra.task_id = t.task_id
       JOIN events e ON ra.event_id = e.event_id
       JOIN departments d ON e.department_id = d.department_id
       WHERE ra.user_id = $1
       ORDER BY ra.id DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    const assignments = rows.map(row => ({
      id: row.id,
      role: row.role,
      financialLimits: deserializeFinancialLimits(row.financial_limits),
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
  } catch (error) {
    console.error('Error in getMyRaciAssignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve RACI assignments',
      error: error.message
    });
  }
};

// @desc    Get company RACI assignments (for company admins)
// @route   GET /api/raci-tracker/company
// @access  Private (company_admin)
exports.getCompanyRaciAssignments = async (req, res, next) => {
  try {
    console.log('Fetching company RACI assignments...');
    const companyId = req.user.company_id;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * pageSize;

    // Get count of records
    const countResult = await db.query(
      `SELECT COUNT(ra.id) 
       FROM raci_assignments ra
       JOIN users u ON ra.user_id = u.user_id
       WHERE u.company_id = $1`,
      [companyId]
    );
    
    const totalItems = parseInt(countResult.rows[0].count);
    console.log(`Found ${totalItems} RACI assignments for company ${companyId}`);

    // If no assignments, return empty array
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

    // Get RACI assignments for the company with pagination
    const { rows } = await db.query(
      `SELECT ra.id, ra.role, ra.user_id, ra.financial_limits, 
              u.user_id, u.full_name, u.email, u.role as user_role,
              t.task_id, t.name as task_name, t.description as task_description,
              e.event_id, e.name as event_name, e.start_date, e.end_date, e.status as event_status,
              d.department_id, d.name as department_name
       FROM raci_assignments ra
       JOIN users u ON ra.user_id = u.user_id
       JOIN tasks t ON ra.task_id = t.task_id
       JOIN events e ON ra.event_id = e.event_id
       JOIN departments d ON e.department_id = d.department_id
       WHERE u.company_id = $1
       ORDER BY ra.id DESC
       LIMIT $2 OFFSET $3`,
      [companyId, pageSize, offset]
    );

    // Format the response
    const assignments = rows.map(row => ({
      id: row.id,
      user: {
        id: row.user_id,
        name: row.full_name,
        email: row.email,
        role: row.user_role
      },
      role: row.role,
      financialLimits: deserializeFinancialLimits(row.financial_limits),
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
    console.error('Error in getCompanyRaciAssignments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve company RACI assignments',
      error: error.message
    });
  }
};

// @desc    Create approval requests for RACI assignments
// @route   POST /api/raci/:eventId/approvals
// @access  Private (company_admin or hod)
exports.createRaciApprovals = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { approvers } = req.body; // Array of { userId, approvalLevel }
    
    // Check if event exists and user has permission
    const eventCheck = await db.query(
      'SELECT e.*, d.name as department_name FROM events e JOIN departments d ON e.department_id = d.department_id WHERE e.event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const event = eventCheck.rows[0];
    
    // Check authorization
    const isHod = req.user.user_id === event.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin';
    
    if (!isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create approvals for this event'
      });
    }
    
    // Get all RACI assignments for this event
    const raciAssignments = await db.query(
      'SELECT DISTINCT raci_id FROM raci_assignments WHERE event_id = $1',
      [eventId]
    );
    
    if (raciAssignments.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No RACI assignments found for this event. Create RACI matrix first.'
      });
    }
    
    await db.query('BEGIN');
    
    try {
      // Clear any existing approvals for this event's RACI assignments
      await db.query(
        `DELETE FROM raci_approvals 
         WHERE raci_id IN (SELECT raci_id FROM raci_assignments WHERE event_id = $1)`,
        [eventId]
      );
      
      const createdApprovals = [];
      
      // Create approval requests for each approver and each RACI assignment
      for (const assignment of raciAssignments.rows) {
        for (const approver of approvers) {
          const approvalResult = await db.query(
            `INSERT INTO raci_approvals (raci_id, approval_level, approved_by, status)
             VALUES ($1, $2, $3, 'PENDING')
             RETURNING approval_id, approval_level, approved_by`,
            [assignment.raci_id, approver.approvalLevel, approver.userId]
          );
          
          createdApprovals.push(approvalResult.rows[0]);
        }
      }
      
      await db.query('COMMIT');
      
      logger.info(`Created ${createdApprovals.length} approval requests for event ${eventId}`);
      
      res.status(201).json({
        success: true,
        message: 'RACI approval requests created successfully',
        eventId,
        approvalsCreated: createdApprovals.length
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`Error creating RACI approvals: ${error.message}`);
    next(error);
  }
};

// @desc    Get pending RACI approvals for a user
// @route   GET /api/raci/approvals/pending
// @access  Private
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    
    // Debug: First check if any approval records exist at all
    const debugApprovalCount = await db.query(
      'SELECT COUNT(*) as total_approvals FROM raci_approvals'
    );
    
    // Debug: Check if user has any approval assignments
    const debugUserApprovals = await db.query(
      'SELECT COUNT(*) as user_approvals FROM raci_approvals WHERE approved_by = $1',
      [userId]
    );
    
    // Debug: Check RACI assignments without approvals
    const debugRaciWithoutApprovals = await db.query(
      `SELECT DISTINCT e.event_id, e.name as event_name, COUNT(ra.raci_id) as raci_count
       FROM events e
       JOIN raci_assignments ra ON e.event_id = ra.event_id
       LEFT JOIN raci_approvals rap ON ra.raci_id = rap.raci_id
       WHERE rap.raci_id IS NULL
       GROUP BY e.event_id, e.name`
    );
    
    console.log(`🔍 DEBUG - Total approval records in DB: ${debugApprovalCount.rows[0].total_approvals}`);
    console.log(`🔍 DEBUG - User ${userId} approval assignments: ${debugUserApprovals.rows[0].user_approvals}`);
    console.log(`🔍 DEBUG - Events with RACI but no approvals:`, debugRaciWithoutApprovals.rows);
    
    const query = `
      SELECT ra.approval_id, ra.approval_level, ra.status, ra.created_at,
             rac.event_id, rac.task_id, rac.type, rac.level,
             e.name as event_name, e.description as event_description,
             t.name as task_name, t.description as task_description,
             u.full_name as assigned_user_name,
             d.name as department_name
      FROM raci_approvals ra
      JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
      JOIN events e ON rac.event_id = e.event_id
      JOIN tasks t ON rac.task_id = t.task_id
      JOIN users u ON rac.user_id = u.user_id
      JOIN departments d ON e.department_id = d.department_id
      WHERE ra.approved_by = $1 AND ra.status = 'PENDING'
      ORDER BY ra.created_at DESC
    `;
    
    const { rows } = await db.query(query, [userId]);
    
    console.log(`🔍 DEBUG - Query returned ${rows.length} pending approvals for user ${userId}`);
    
    // Group approvals by event
    const approvalsByEvent = {};
    
    rows.forEach(row => {
      const eventKey = row.event_id;
      
      if (!approvalsByEvent[eventKey]) {
        approvalsByEvent[eventKey] = {
          eventId: row.event_id,
          eventName: row.event_name,
          eventDescription: row.event_description,
          departmentName: row.department_name,
          approvals: []
        };
      }
      
      approvalsByEvent[eventKey].approvals.push({
        approvalId: row.approval_id,
        approvalLevel: row.approval_level,
        status: row.status,
        createdAt: row.created_at,
        taskName: row.task_name,
        taskDescription: row.task_description,
        assignedUserName: row.assigned_user_name,
        raciType: row.type,
        raciLevel: row.level
      });
    });
    
    const pendingApprovals = Object.values(approvalsByEvent);
    
    res.status(200).json({
      success: true,
      pendingApprovals,
      debug: {
        totalApprovalRecords: debugApprovalCount.rows[0].total_approvals,
        userApprovalAssignments: debugUserApprovals.rows[0].user_approvals,
        eventsWithoutApprovals: debugRaciWithoutApprovals.rows
      }
    });
  } catch (error) {
    logger.error(`Error getting pending approvals: ${error.message}`);
    next(error);
  }
};

// @desc    Get RACI matrix for approval (read-only view)
// @route   GET /api/raci/:eventId/approval-view
// @access  Private
exports.getRaciMatrixForApproval = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.user_id;
    
    // Check if user has pending approvals for this event
    const approvalCheck = await db.query(
      `SELECT COUNT(*) as pending_count
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
       WHERE rac.event_id = $1 AND ra.approved_by = $2 AND ra.status = 'PENDING'`,
      [eventId, userId]
    );
    
    if (parseInt(approvalCheck.rows[0].pending_count) === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have pending approvals for this RACI matrix'
      });
    }
    
    // Get event details
    const eventResult = await db.query(
      `SELECT e.*, d.name as department_name 
       FROM events e 
       JOIN departments d ON e.department_id = d.department_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const event = eventResult.rows[0];
    
    // Get all tasks for this event with RACI assignments
    const tasksResult = await db.query(
      `SELECT * FROM tasks WHERE event_id = $1 ORDER BY created_at`,
      [eventId]
    );
    
    const tasks = [];
    
    // For each task, get RACI assignments
    for (const task of tasksResult.rows) {
      const raciResult = await db.query(
        `SELECT ra.*, u.full_name, u.email, u.role, u.designation 
         FROM raci_assignments ra
         JOIN users u ON ra.user_id = u.user_id
         WHERE ra.event_id = $1 AND ra.task_id = $2
         ORDER BY ra.level, ra.type, u.full_name`,
        [eventId, task.task_id]
      );
      
      // Organize by RACI type
      const responsible = [];
      const accountable = [];
      const consulted = [];
      const informed = [];
      
      raciResult.rows.forEach(row => {
        const userData = {
          id: row.user_id,
          name: row.full_name,
          email: row.email,
          role: row.role,
          designation: row.designation,
          level: row.level,
          financialLimits: row.financial_limit_min || row.financial_limit_max ? {
            min: row.financial_limit_min,
            max: row.financial_limit_max
          } : null
        };
        
        switch(row.type) {
          case 'R': responsible.push(userData); break;
          case 'A': accountable.push(userData); break;
          case 'C': consulted.push(userData); break;
          case 'I': informed.push(userData); break;
        }
      });
      
      tasks.push({
        id: task.task_id,
        name: task.name,
        description: task.description,
        status: task.status,
        raci: {
          responsible,
          accountable,
          consulted,
          informed
        }
      });
    }
    
    // Get approval summary for this user
    const approvalSummary = await db.query(
      `SELECT ra.approval_level, COUNT(*) as count
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
       WHERE rac.event_id = $1 AND ra.approved_by = $2 AND ra.status = 'PENDING'
       GROUP BY ra.approval_level
       ORDER BY ra.approval_level`,
      [eventId, userId]
    );
    
    res.status(200).json({
      eventId: event.event_id,
      name: event.name,
      description: event.description,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      tasks,
      approvalSummary: approvalSummary.rows,
      isReadOnly: true
    });
  } catch (error) {
    logger.error(`Error getting RACI matrix for approval: ${error.message}`);
    next(error);
  }
};

// @desc    Approve or reject RACI matrix
// @route   POST /api/raci/:eventId/approve
// @access  Private
exports.approveRejectRaciMatrix = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'
    const userId = req.user.user_id;
    
    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }
    
    // For reject, reason is mandatory
    if (action === 'reject' && (!reason || reason.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when rejecting RACI matrix'
      });
    }
    
    // Get pending approvals for this user and event
    const pendingApprovals = await db.query(
      `SELECT ra.approval_id
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
       WHERE rac.event_id = $1 AND ra.approved_by = $2 AND ra.status = 'PENDING'`,
      [eventId, userId]
    );
    
    if (pendingApprovals.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No pending approvals found for this event'
      });
    }
    
    await db.query('BEGIN');
    
    try {
      const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
      const approvedAt = action === 'approve' ? new Date() : null;
      
      // Update all pending approvals for this user and event
      await db.query(
        `UPDATE raci_approvals
         SET status = $1, reason = $2, approved_at = $3, updated_at = CURRENT_TIMESTAMP
         WHERE approval_id = ANY($4::int[])`,
        [status, reason, approvedAt, pendingApprovals.rows.map(row => row.approval_id)]
      );
      
      await db.query('COMMIT');
      
      logger.info(`User ${userId} ${action}ed RACI matrix for event ${eventId}`);
      
      res.status(200).json({
        success: true,
        message: `RACI matrix ${action}ed successfully`,
        action: status,
        eventId,
        approvalsUpdated: pendingApprovals.rows.length
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`Error ${req.body.action}ing RACI matrix: ${error.message}`);
    next(error);
  }
};

// @desc    Get RACI approval status for an event
// @route   GET /api/raci/:eventId/approval-status
// @access  Private
exports.getRaciApprovalStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    console.log(`🔍 Getting approval status for event ID: ${eventId}`);
    
    // Check if event exists
    const eventCheck = await db.query(
      'SELECT name FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Debug: Get raw approval data first
    const rawApprovals = await db.query(
      `SELECT ra.approval_id, ra.raci_id, ra.approval_level, ra.approved_by, ra.status, ra.created_at, ra.updated_at,
              u.full_name as approver_name, u.email as approver_email
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
       JOIN users u ON ra.approved_by = u.user_id
       WHERE rac.event_id = $1
       ORDER BY ra.approval_level, u.full_name`,
      [eventId]
    );
    
    console.log(`🔍 Raw approval data for event ${eventId}:`, rawApprovals.rows);
    
    // Get approval status summary with reason
    const approvalStatus = await db.query(
      `SELECT ra.approval_level, ra.status, COUNT(*) as count,
              u.full_name as approver_name, u.email as approver_email,
              MAX(ra.updated_at) as last_updated,
              CASE 
                WHEN ra.status != 'PENDING' THEN MAX(ra.reason)
                ELSE NULL 
              END as reason
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
       JOIN users u ON ra.approved_by = u.user_id
       WHERE rac.event_id = $1
       GROUP BY ra.approval_level, ra.status, u.full_name, u.email
       ORDER BY ra.approval_level, ra.status`,
      [eventId]
    );
    
    console.log(`🔍 Approval status summary for event ${eventId}:`, approvalStatus.rows);
    
    // Get detailed approval information
    const detailedApprovals = await db.query(
      `SELECT ra.approval_id, ra.approval_level, ra.status, ra.reason, ra.approved_at,
              u.full_name as approver_name, u.email as approver_email
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
       JOIN users u ON ra.approved_by = u.user_id
       WHERE rac.event_id = $1
       ORDER BY ra.approval_level, u.full_name`,
      [eventId]
    );
    
    console.log(`🔍 Detailed approvals for event ${eventId}:`, detailedApprovals.rows);
    
    // Calculate overall status
    const totalApprovals = detailedApprovals.rows.length;
    const approvedCount = detailedApprovals.rows.filter(row => row.status === 'APPROVED').length;
    const rejectedCount = detailedApprovals.rows.filter(row => row.status === 'REJECTED').length;
    const pendingCount = detailedApprovals.rows.filter(row => row.status === 'PENDING').length;
    
    console.log(`🔍 Status calculations for event ${eventId}:`, {
      total: totalApprovals,
      approved: approvedCount,
      rejected: rejectedCount,
      pending: pendingCount
    });
    
    let overallStatus = 'PENDING';
    if (rejectedCount > 0) {
      overallStatus = 'REJECTED';
    } else if (approvedCount === totalApprovals) {
      overallStatus = 'APPROVED';
    }
    
    console.log(`🔍 Overall status for event ${eventId}: ${overallStatus}`);
    
    res.status(200).json({
      eventId,
      eventName: eventCheck.rows[0].name,
      overallStatus,
      summary: {
        total: totalApprovals,
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount
      },
      approvalsByLevel: approvalStatus.rows,
      detailedApprovals: detailedApprovals.rows,
      debug: {
        rawApprovalData: rawApprovals.rows
      }
    });
  } catch (error) {
    logger.error(`Error getting RACI approval status: ${error.message}`);
    next(error);
  }
};

// @desc    Get users eligible for approval based on level
// @route   GET /api/raci/eligible-approvers
// @access  Private (company_admin or hod)
exports.getEligibleApprovers = async (req, res, next) => {
  try {
    const { level } = req.query;
    const companyId = req.user.company_id;
    
    // Build query based on level and approval_assign flag
    let query = `
      SELECT u.user_id, u.full_name, u.email, u.role, u.designation,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.company_id = $1 AND u.approval_assign = true
    `;
    
    const queryParams = [companyId];
    
    if (level) {
      // For specific level, you can add level-based filtering logic here
      // This is a placeholder - you can customize based on your business logic
      query += ` AND u.role IN ('hod', 'company_admin')`;
    }
    
    query += ` ORDER BY u.role DESC, u.full_name`;
    
    const { rows } = await db.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      eligibleApprovers: rows.map(user => ({
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        department: user.department_name
      }))
    });
  } catch (error) {
    logger.error(`Error getting eligible approvers: ${error.message}`);
    next(error);
  }
};

// @desc    Debug endpoint - Get raw approval data for an event
// @route   GET /api/raci/:eventId/debug-approvals
// @access  Private
exports.debugEventApprovals = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    // Get all approval records for this event with full details
    const approvalRecords = await db.query(
      `SELECT ra.approval_id, ra.raci_id, ra.approval_level, ra.approved_by, ra.status, 
              ra.reason, ra.created_at, ra.updated_at, ra.approved_at,
              rac.user_id as assigned_user_id, rac.type as raci_type, rac.level as raci_level,
              u.full_name as approver_name, u.email as approver_email,
              assigned_user.full_name as assigned_user_name,
              e.name as event_name, t.name as task_name
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
       JOIN users u ON ra.approved_by = u.user_id
       JOIN users assigned_user ON rac.user_id = assigned_user.user_id
       JOIN events e ON rac.event_id = e.event_id
       JOIN tasks t ON rac.task_id = t.task_id
       WHERE rac.event_id = $1
       ORDER BY ra.approval_level, ra.approved_by, ra.approval_id`,
      [eventId]
    );
    
    // Count by status
    const statusCounts = {
      APPROVED: approvalRecords.rows.filter(r => r.status === 'APPROVED').length,
      PENDING: approvalRecords.rows.filter(r => r.status === 'PENDING').length,
      REJECTED: approvalRecords.rows.filter(r => r.status === 'REJECTED').length
    };
    
    // Group by approver
    const byApprover = {};
    approvalRecords.rows.forEach(record => {
      const approverKey = `${record.approved_by}-${record.approver_name}`;
      if (!byApprover[approverKey]) {
        byApprover[approverKey] = {
          approverId: record.approved_by,
          approverName: record.approver_name,
          approverEmail: record.approver_email,
          approvals: []
        };
      }
      byApprover[approverKey].approvals.push({
        approvalId: record.approval_id,
        level: record.approval_level,
        status: record.status,
        raciType: record.raci_type,
        assignedTo: record.assigned_user_name,
        taskName: record.task_name,
        updatedAt: record.updated_at
      });
    });
    
    res.status(200).json({
      success: true,
      eventId,
      eventName: approvalRecords.rows[0]?.event_name || 'Unknown',
      totalRecords: approvalRecords.rows.length,
      statusCounts,
      byApprover: Object.values(byApprover),
      rawRecords: approvalRecords.rows
    });
  } catch (error) {
    logger.error(`Error in debug event approvals: ${error.message}`);
    next(error);
  }
};

// @desc    Get pending RACI approvals with auto-creation for company admins
// @route   GET /api/raci/approvals/pending-with-auto-create
// @access  Private (company_admin)
exports.getPendingApprovalsWithAutoCreate = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const userRole = req.user.role;
    const companyId = req.user.company_id;
    
    // Only allow company admins to use this endpoint
    if (userRole !== 'company_admin') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available for company admins'
      });
    }
    
    console.log(`🔍 Company Admin ${userId} requesting pending approvals with auto-create`);
    
    // First, check if there are any events with RACI assignments but no approval requests
    const eventsNeedingApprovals = await db.query(
      `SELECT DISTINCT e.event_id, e.name as event_name, COUNT(ra.raci_id) as raci_count
       FROM events e
       JOIN departments d ON e.department_id = d.department_id
       JOIN raci_assignments ra ON e.event_id = ra.event_id
       LEFT JOIN raci_approvals rap ON ra.raci_id = rap.raci_id
       WHERE d.company_id = $1 AND rap.raci_id IS NULL
       GROUP BY e.event_id, e.name`,
      [companyId]
    );
    
    console.log(`🔍 Found ${eventsNeedingApprovals.rows.length} events needing approval creation`);
    
    // Auto-create approvals for events that need them
    for (const event of eventsNeedingApprovals.rows) {
      console.log(`🔄 Auto-creating approvals for event ${event.event_id}: ${event.event_name}`);
      
      // Get all RACI assignments for this event
      const raciAssignments = await db.query(
        'SELECT DISTINCT raci_id FROM raci_assignments WHERE event_id = $1',
        [event.event_id]
      );
      
      if (raciAssignments.rows.length > 0) {
        await db.query('BEGIN');
        
        try {
          // Create approval requests with the current company admin as approver
          // You can modify this logic to assign different approvers based on your business rules
          const approvers = [
            { userId: userId, approvalLevel: 1 },
            { userId: userId, approvalLevel: 2 }  // For now, assign company admin to both levels
          ];
          
          for (const assignment of raciAssignments.rows) {
            for (const approver of approvers) {
              await db.query(
                `INSERT INTO raci_approvals (raci_id, approval_level, approved_by, status)
                 VALUES ($1, $2, $3, 'PENDING')`,
                [assignment.raci_id, approver.approvalLevel, approver.userId]
              );
            }
          }
          
          await db.query('COMMIT');
          console.log(`✅ Created approval requests for event ${event.event_id}`);
        } catch (error) {
          await db.query('ROLLBACK');
          console.error(`❌ Error creating approvals for event ${event.event_id}:`, error);
        }
      }
    }
    
    // Now get the pending approvals using the existing logic
    const query = `
      SELECT ra.approval_id, ra.approval_level, ra.status, ra.created_at,
             rac.event_id, rac.task_id, rac.type, rac.level,
             e.name as event_name, e.description as event_description,
             t.name as task_name, t.description as task_description,
             u.full_name as assigned_user_name,
             d.name as department_name
      FROM raci_approvals ra
      JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
      JOIN events e ON rac.event_id = e.event_id
      JOIN tasks t ON rac.task_id = t.task_id
      JOIN users u ON rac.user_id = u.user_id
      JOIN departments d ON e.department_id = d.department_id
      WHERE ra.approved_by = $1 AND ra.status = 'PENDING'
      ORDER BY ra.created_at DESC
    `;
    
    const { rows } = await db.query(query, [userId]);
    
    console.log(`🔍 Query returned ${rows.length} pending approvals for company admin ${userId}`);
    
    // Group approvals by event
    const approvalsByEvent = {};
    
    rows.forEach(row => {
      const eventKey = row.event_id;
      
      if (!approvalsByEvent[eventKey]) {
        approvalsByEvent[eventKey] = {
          eventId: row.event_id,
          eventName: row.event_name,
          eventDescription: row.event_description,
          departmentName: row.department_name,
          approvals: []
        };
      }
      
      approvalsByEvent[eventKey].approvals.push({
        approvalId: row.approval_id,
        approvalLevel: row.approval_level,
        status: row.status,
        createdAt: row.created_at,
        taskName: row.task_name,
        taskDescription: row.task_description,
        assignedUserName: row.assigned_user_name,
        raciType: row.type,
        raciLevel: row.level
      });
    });
    
    const pendingApprovals = Object.values(approvalsByEvent);
    
    res.status(200).json({
      success: true,
      pendingApprovals,
      autoCreated: eventsNeedingApprovals.rows.length,
      message: eventsNeedingApprovals.rows.length > 0 
        ? `Auto-created approval requests for ${eventsNeedingApprovals.rows.length} events`
        : 'No new approval requests needed'
    });
  } catch (error) {
    logger.error(`Error getting pending approvals with auto-create: ${error.message}`);
    next(error);
  }
};

// @desc    Get RACI approval history for current user
// @route   GET /api/raci/approvals/my-history
// @access  Private (hod, user with approval permissions)
exports.getMyApprovalHistory = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * pageSize;
    
    console.log(`📜 Getting approval history for user ID: ${userId}`);
    
    // Get total count of approval history records
    const countResult = await db.query(
      `SELECT COUNT(*) as total_count
       FROM raci_approvals ra
       WHERE ra.approved_by = $1 AND ra.status != 'PENDING'`,
      [userId]
    );
    
    const totalItems = parseInt(countResult.rows[0].total_count);
    
    // If no history found, return empty array
    if (totalItems === 0) {
      return res.status(200).json({
        success: true,
        message: "No approval history found",
        totalItems: 0,
        totalPages: 0,
        currentPage: page,
        approvalHistory: []
      });
    }
    
    // Get approval history with pagination including all RACI assignment details
    const historyQuery = `
      SELECT ra.approval_id, ra.approval_level, ra.status, ra.reason, 
             ra.approved_at, ra.created_at, ra.updated_at,
             rac.raci_id, rac.event_id, rac.task_id, rac.type as raci_type, 
             rac.level as raci_level, rac.financial_limit_min, rac.financial_limit_max,
             e.name as event_name, e.description as event_description, e.approval_status as event_status,
             t.name as task_name, t.description as task_description, t.status as task_status,
             u.user_id as assigned_user_id, u.full_name as assigned_user_name, 
             u.email as assigned_user_email, u.role as assigned_user_role, 
             u.designation as assigned_user_designation, u.phone as assigned_user_phone,
             u.employee_id as assigned_user_employee_id,
             d.department_id, d.name as department_name,
             company.company_id, company.name as company_name
      FROM raci_approvals ra
      JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
      JOIN events e ON rac.event_id = e.event_id
      JOIN tasks t ON rac.task_id = t.task_id
      JOIN users u ON rac.user_id = u.user_id
      JOIN departments d ON e.department_id = d.department_id
      JOIN companies company ON d.company_id = company.company_id
      WHERE ra.approved_by = $1 AND ra.status != 'PENDING'
      ORDER BY ra.updated_at DESC, ra.approved_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const { rows } = await db.query(historyQuery, [userId, pageSize, offset]);
    
    console.log(`📜 Found ${rows.length} approval history records for user ${userId}`);
    
    // Group approvals by event for better organization
    const historyByEvent = {};
    
    rows.forEach(row => {
      const eventKey = row.event_id;
      
      if (!historyByEvent[eventKey]) {
        historyByEvent[eventKey] = {
          eventId: row.event_id,
          eventName: row.event_name,
          eventDescription: row.event_description,
          eventStatus: row.event_status,
          department: {
            id: row.department_id,
            name: row.department_name
          },
          company: {
            id: row.company_id,
            name: row.company_name
          },
          approvals: []
        };
      }
      
      // Construct financial limits object if exists
      const financialLimits = (row.financial_limit_min !== null || row.financial_limit_max !== null) ? {
        min: row.financial_limit_min,
        max: row.financial_limit_max
      } : null;
      
      historyByEvent[eventKey].approvals.push({
        approvalId: row.approval_id,
        approvalLevel: row.approval_level,
        status: row.status,
        reason: row.reason || null,
        approvedAt: row.approved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        raciAssignment: {
          id: row.raci_id,
          type: row.raci_type,
          level: row.raci_level,
          financialLimits: financialLimits
        },
        task: {
          id: row.task_id,
          name: row.task_name,
          description: row.task_description,
          status: row.task_status
        },
        assignedUser: {
          id: row.assigned_user_id,
          name: row.assigned_user_name,
          email: row.assigned_user_email,
          role: row.assigned_user_role,
          designation: row.assigned_user_designation,
          phone: row.assigned_user_phone,
          employeeId: row.assigned_user_employee_id
        }
      });
    });
    
    const approvalHistory = Object.values(historyByEvent);
    
    // Calculate summary statistics
    const approvedCount = rows.filter(row => row.status === 'APPROVED').length;
    const rejectedCount = rows.filter(row => row.status === 'REJECTED').length;
    
    res.status(200).json({
      success: true,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      currentPage: page,
      summary: {
        totalDecisions: totalItems,
        approved: approvedCount,
        rejected: rejectedCount
      },
      approvalHistory,
      message: `Retrieved ${approvalHistory.length} events with approval history`
    });
  } catch (error) {
    logger.error(`Error getting approval history: ${error.message}`);
    next(error);
  }
};

// @desc    Force refresh and get updated RACI approval status
// @route   GET /api/raci/:eventId/refresh-status
// @access  Private
exports.refreshRaciApprovalStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    console.log(`🔄 Force refreshing approval status for event ID: ${eventId}`);
    
    // Get event details
    const eventCheck = await db.query(
      'SELECT name FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Force a fresh query with no caching - get all approval records
    const freshApprovalData = await db.query(
      `SELECT ra.approval_id, ra.approval_level, ra.status, ra.approved_by, ra.updated_at,
              u.full_name as approver_name, u.email as approver_email
       FROM raci_approvals ra
       JOIN raci_assignments rac ON ra.raci_id = rac.raci_id  
       JOIN users u ON ra.approved_by = u.user_id
       WHERE rac.event_id = $1
       ORDER BY ra.approval_level, ra.approved_by`,
      [eventId]
    );
    
    console.log(`🔄 Fresh approval data retrieved:`, freshApprovalData.rows);
    
    // Calculate fresh status counts
    const totalApprovals = freshApprovalData.rows.length;
    const approvedCount = freshApprovalData.rows.filter(row => row.status === 'APPROVED').length;
    const rejectedCount = freshApprovalData.rows.filter(row => row.status === 'REJECTED').length;
    const pendingCount = freshApprovalData.rows.filter(row => row.status === 'PENDING').length;
    
    // Determine overall status
    let overallStatus = 'PENDING';
    if (rejectedCount > 0) {
      overallStatus = 'REJECTED';
    } else if (approvedCount === totalApprovals && totalApprovals > 0) {
      overallStatus = 'APPROVED';
    }
    
    console.log(`🔄 Fresh status calculation:`, {
      total: totalApprovals,
      approved: approvedCount,
      rejected: rejectedCount,
      pending: pendingCount,
      overallStatus
    });
    
    // Group by approval level for summary
    const levelSummary = {};
    freshApprovalData.rows.forEach(row => {
      const level = row.approval_level;
      if (!levelSummary[level]) {
        levelSummary[level] = { level, approved: 0, pending: 0, rejected: 0, total: 0 };
      }
      levelSummary[level].total++;
      levelSummary[level][row.status.toLowerCase()]++;
    });
    
    res.status(200).json({
      success: true,
      eventId,
      eventName: eventCheck.rows[0].name,
      overallStatus,
      summary: {
        total: totalApprovals,
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount
      },
      levelSummary: Object.values(levelSummary),
      detailedApprovals: freshApprovalData.rows,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error refreshing RACI approval status: ${error.message}`);
    next(error);
  }
};

// @desc    Get events eligible for RACI matrix creation
// @route   GET /api/raci/eligible-events
// @access  Private (company_admin or hod)
exports.getEligibleEventsForRaci = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const departmentId = req.user.department_id;
    const isCompanyAdmin = req.user.role === 'company_admin';
    
    let query = '';
    let queryParams = [];
    
    if (isCompanyAdmin) {
      // For company admin, get all approved events with tasks from their company
      query = `
        SELECT DISTINCT e.event_id, e.name, e.description, e.division, e.priority, e.event_type, e.kpi,
               e.department_id, e.approval_status, e.created_at,
               d.name as department_name,
               COUNT(t.task_id) as task_count,
               COUNT(ra.raci_id) as raci_assignment_count
        FROM events e
        LEFT JOIN departments d ON e.department_id = d.department_id
        LEFT JOIN tasks t ON e.event_id = t.event_id
        LEFT JOIN raci_assignments ra ON e.event_id = ra.event_id
        WHERE d.company_id = $1 AND e.approval_status = 'APPROVED'
        GROUP BY e.event_id, e.name, e.description, e.division, e.priority, e.event_type, e.kpi,
                 e.department_id, e.approval_status, e.created_at, d.name
        HAVING COUNT(t.task_id) > 0
        ORDER BY e.created_at DESC
      `;
      queryParams = [companyId];
    } else {
      // For HOD, get only approved events with tasks from their department
      query = `
        SELECT DISTINCT e.event_id, e.name, e.description, e.division, e.priority, e.event_type, e.kpi,
               e.department_id, e.approval_status, e.created_at,
               d.name as department_name,
               COUNT(t.task_id) as task_count,
               COUNT(ra.raci_id) as raci_assignment_count
        FROM events e
        LEFT JOIN departments d ON e.department_id = d.department_id
        LEFT JOIN tasks t ON e.event_id = t.event_id
        LEFT JOIN raci_assignments ra ON e.event_id = ra.event_id
        WHERE e.department_id = $1 AND e.approval_status = 'APPROVED'
        GROUP BY e.event_id, e.name, e.description, e.division, e.priority, e.event_type, e.kpi,
                 e.department_id, e.approval_status, e.created_at, d.name
        HAVING COUNT(t.task_id) > 0
        ORDER BY e.created_at DESC
      `;
      queryParams = [departmentId];
    }

    const { rows } = await db.query(query, queryParams);

    // Format the response
    const events = rows.map(event => ({
      id: event.event_id,
      name: event.name,
      description: event.description,
      division: event.division,
      priority: event.priority,
      eventType: event.event_type,
      kpi: event.kpi,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      status: event.approval_status,
      taskCount: parseInt(event.task_count),
      raciAssignmentCount: parseInt(event.raci_assignment_count),
      hasRaciAssignments: parseInt(event.raci_assignment_count) > 0,
      createdAt: event.created_at
    }));

    res.status(200).json({
      success: true,
      message: "Events eligible for RACI matrix creation",
      events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all approved events for RACI matrix creation (including those without tasks)
// @route   GET /api/raci/all-approved-events
// @access  Private (company_admin or hod)
exports.getAllApprovedEventsForRaci = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const departmentId = req.user.department_id;
    const isCompanyAdmin = req.user.role === 'company_admin';
    
    let query = '';
    let queryParams = [];
    
    if (isCompanyAdmin) {
      // For company admin, get all approved events from their company
      query = `
        SELECT DISTINCT e.event_id, e.name, e.description, e.division, e.priority, e.event_type, e.kpi,
               e.department_id, e.approval_status, e.created_at,
               d.name as department_name,
               COUNT(t.task_id) as task_count,
               COUNT(ra.raci_id) as raci_assignment_count
        FROM events e
        LEFT JOIN departments d ON e.department_id = d.department_id
        LEFT JOIN tasks t ON e.event_id = t.event_id
        LEFT JOIN raci_assignments ra ON e.event_id = ra.event_id
        WHERE d.company_id = $1 AND e.approval_status = 'APPROVED'
        GROUP BY e.event_id, e.name, e.description, e.division, e.priority, e.event_type, e.kpi,
                 e.department_id, e.approval_status, e.created_at, d.name
        ORDER BY e.created_at DESC
      `;
      queryParams = [companyId];
    } else {
      // For HOD, get only approved events from their department
      query = `
        SELECT DISTINCT e.event_id, e.name, e.description, e.division, e.priority, e.event_type, e.kpi,
               e.department_id, e.approval_status, e.created_at,
               d.name as department_name,
               COUNT(t.task_id) as task_count,
               COUNT(ra.raci_id) as raci_assignment_count
        FROM events e
        LEFT JOIN departments d ON e.department_id = d.department_id
        LEFT JOIN tasks t ON e.event_id = t.event_id
        LEFT JOIN raci_assignments ra ON e.event_id = ra.event_id
        WHERE e.department_id = $1 AND e.approval_status = 'APPROVED'
        GROUP BY e.event_id, e.name, e.description, e.division, e.priority, e.event_type, e.kpi,
                 e.department_id, e.approval_status, e.created_at, d.name
        ORDER BY e.created_at DESC
      `;
      queryParams = [departmentId];
    }

    const { rows } = await db.query(query, queryParams);

    // Format the response
    const events = rows.map(event => ({
      id: event.event_id,
      name: event.name,
      description: event.description,
      division: event.division,
      priority: event.priority,
      eventType: event.event_type,
      kpi: event.kpi,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      status: event.approval_status,
      taskCount: parseInt(event.task_count),
      raciAssignmentCount: parseInt(event.raci_assignment_count),
      hasTasks: parseInt(event.task_count) > 0,
      hasRaciAssignments: parseInt(event.raci_assignment_count) > 0,
      createdAt: event.created_at
    }));

    res.status(200).json({
      success: true,
      message: "All approved events for RACI matrix creation",
      events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get approved events for dropdown selection in RACI matrix creation
// @route   GET /api/raci/events-dropdown
// @access  Private (company_admin or hod)
exports.getApprovedEventsForDropdown = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const departmentId = req.user.department_id;
    const isCompanyAdmin = req.user.role === 'company_admin';
    
    let query = '';
    let queryParams = [];
    
    if (isCompanyAdmin) {
      // For company admin, get all approved events from their company
      query = `
        SELECT e.event_id, e.name, e.description, e.department_id,
               d.name as department_name
        FROM events e
        LEFT JOIN departments d ON e.department_id = d.department_id
        WHERE d.company_id = $1 AND e.approval_status = 'APPROVED'
        ORDER BY e.created_at DESC
      `;
      queryParams = [companyId];
    } else {
      // For HOD, get only approved events from their department
      query = `
        SELECT e.event_id, e.name, e.description, e.department_id,
               d.name as department_name
        FROM events e
        LEFT JOIN departments d ON e.department_id = d.department_id
        WHERE e.department_id = $1 AND e.approval_status = 'APPROVED'
        ORDER BY e.created_at DESC
      `;
      queryParams = [departmentId];
    }

    const { rows } = await db.query(query, queryParams);

    // Format the response for dropdown
    const events = rows.map(event => ({
      value: event.event_id,
      label: event.name,
      description: event.description,
      department: event.department_name
    }));

    res.status(200).json({
      success: true,
      message: "Approved events for dropdown",
      events
    });
  } catch (error) {
    next(error);
  }
};
