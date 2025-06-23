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
      const { taskId, responsible, accountable, consulted, informed, financialLimits } = assignment;
      
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
          
          // Use the extracted financial limits or null
          await createRaciAssignment(eventId, taskId, 'R', userId, userFinancialLimits);
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
          
          await createRaciAssignment(eventId, taskId, 'A', userId, userFinancialLimits);
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
          
          await createRaciAssignment(eventId, taskId, 'C', userId, userFinancialLimits);
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
          
          await createRaciAssignment(eventId, taskId, 'I', userId, userFinancialLimits);
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
async function createRaciAssignment(eventId, taskId, type, userId, financialLimits = null) {
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
  
  // Log explicit values for debugging
  logger.info(`Setting financial limits for user ${userId}, task ${taskId}, type ${type}: min=${financialLimitMin}, max=${financialLimitMax}`);
  logger.info(`Financial limit input: ${JSON.stringify(financialLimits)}`);
  
  try {
    const result = await db.query(
      `INSERT INTO raci_assignments 
       (event_id, task_id, type, user_id, financial_limit_min, financial_limit_max)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING raci_id, financial_limit_min, financial_limit_max`,
      [eventId, taskId, type, userId, financialLimitMin, financialLimitMax]
    );
    
    // Log what was actually saved in the database
    const savedRow = result.rows[0];
    logger.info(`Saved financial limits in DB: min=${savedRow.financial_limit_min}, max=${savedRow.financial_limit_max}`);
    
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
         ORDER BY ra.type, u.full_name`,
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
    
    res.status(200).json({
      eventId: event.event_id,
      name: event.name,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      tasks
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
      const { taskId, responsible, accountable, consulted, informed, financialLimits } = assignment;
      
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
          
          // Use the extracted financial limits or null
          await createRaciAssignment(eventId, taskId, 'R', userId, userFinancialLimits);
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
          
          await createRaciAssignment(eventId, taskId, 'A', userId, userFinancialLimits);
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
          
          await createRaciAssignment(eventId, taskId, 'C', userId, userFinancialLimits);
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
          
          await createRaciAssignment(eventId, taskId, 'I', userId, userFinancialLimits);
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

// Helper to serialize and deserialize financial limits
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
