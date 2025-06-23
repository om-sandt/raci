const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (company-admin or HOD)
exports.createEvent = async (req, res, next) => {
  try {
    const { name, description, departmentId, employees, tasks, priority, eventType } = req.body;
    const createdBy = req.user.user_id;
    let documentPath = null;

    // Handle document upload
    if (req.file) {
      documentPath = `/uploads/${req.file.filename}`;
    }

    // Check if department exists
    if (departmentId) {
      const departmentCheck = await db.query(
        'SELECT * FROM departments WHERE department_id = $1',
        [departmentId]
      );
      
      if (departmentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      // Get HOD ID
      const hodId = departmentCheck.rows[0].hod_id;

      // Create event
      const result = await db.query(
        `INSERT INTO events (name, description, priority, event_type, department_id, hod_id, created_by, document_path)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING event_id, name, description, priority, event_type, department_id, hod_id, created_by, document_path, approval_status, created_at`,
        [name, description, priority || null, eventType || null, departmentId, hodId, createdBy, documentPath]
      );

      const event = result.rows[0];

      // Get department details
      const departmentResult = await db.query(
        'SELECT department_id, name FROM departments WHERE department_id = $1',
        [event.department_id]
      );
      
      const department = {
        id: departmentResult.rows[0].department_id,
        name: departmentResult.rows[0].name
      };

      // Get HOD details
      let hod = null;
      if (event.hod_id) {
        const hodResult = await db.query(
          'SELECT user_id, full_name FROM users WHERE user_id = $1',
          [event.hod_id]
        );
        
        if (hodResult.rows.length > 0) {
          hod = {
            id: hodResult.rows[0].user_id,
            name: hodResult.rows[0].full_name
          };
        }
      }

      // Handle employee assignments (if provided)
      let employeesList = [];
      if (employees && Array.isArray(employees) && employees.length > 0) {
        // First, verify all employees exist in the database
        const employeeCheck = await db.query(
          `SELECT user_id FROM users WHERE user_id = ANY($1::int[])`,
          [employees]
        );
        
        const validEmployeeIds = employeeCheck.rows.map(e => e.user_id);
        logger.debug(`Valid employee IDs for event assignment: ${validEmployeeIds.join(', ')}`);
        
        // Create an entry in the event_trackers table for each valid employee
        for (const employeeId of validEmployeeIds) {
          try {
            await db.query(
              `INSERT INTO event_trackers (event_id, user_id, status)
              VALUES ($1, $2, $3)`,
              [event.event_id, employeeId, 'pending']
            );
          } catch (err) {
            logger.error(`Failed to assign event to employee ${employeeId}: ${err.message}`);
            // Continue with other employees even if one fails
          }
        }

        // Get employee details for response
        if (validEmployeeIds.length > 0) {
          const employeesResult = await db.query(
            `SELECT user_id, full_name FROM users 
            WHERE user_id = ANY($1::int[])`,
            [validEmployeeIds]
          );
          
          employeesList = employeesResult.rows.map(emp => ({
            id: emp.user_id,
            name: emp.full_name
          }));
        }
      }

      // Create document object if a document was uploaded
      const documents = documentPath ? [{
        id: 1, // Just a placeholder ID
        name: req.file.originalname,
        url: documentPath
      }] : [];

      // Create tasks for the event if provided
      const createdTasks = [];
      if (tasks && Array.isArray(tasks) && tasks.length > 0) {
        logger.debug(`Creating ${tasks.length} tasks for event ${event.event_id}`);
        
        for (const task of tasks) {
          // Validate task properties
          if (!task.name) {
            logger.warn('Skipping task with no name');
            continue;
          }
          
          try {
            const taskResult = await db.query(
              `INSERT INTO tasks (event_id, name, description, status)
              VALUES ($1, $2, $3, $4)
              RETURNING task_id, name, description, status`,
              [event.event_id, task.name, task.description || null, task.status || 'not_started']
            );
            
            createdTasks.push(taskResult.rows[0]);
            logger.debug(`Created task ID ${taskResult.rows[0].task_id}: ${task.name}`);
          } catch (err) {
            logger.error(`Failed to create task "${task.name}": ${err.message}`);
            // Continue with other tasks even if one fails
          }
        }
      }

      res.status(201).json({
        id: event.event_id,
        name: event.name,
        description: event.description,
        priority: event.priority,
        eventType: event.event_type,
        department,
        hod,
        documents,
        employees: employeesList,
        tasks: createdTasks,
        status: event.approval_status,
        createdAt: event.created_at
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Department ID is required'
      });
    }
  } catch (error) {
    // If there was a file upload and an error occurs, clean up the uploaded file
    if (req.file) {
      fs.unlink(req.file.path, err => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    logger.error(`Error creating event: ${error.message}`);
    next(error);
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Private (company member)
exports.getEvents = async (req, res, next) => {
  try {
    const { departmentId, status, page = 1, limit = 10 } = req.query;
    const companyId = req.user.company_id;
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build query with filters
    let query = `
      SELECT e.event_id, e.name, e.priority, e.event_type, e.department_id, e.approval_status, e.created_at,
      d.name as department_name
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE d.company_id = $1
    `;
    
    const queryParams = [companyId];
    let paramIndex = 2;

    if (departmentId) {
      query += ` AND e.department_id = $${paramIndex++}`;
      queryParams.push(departmentId);
    }

    if (status) {
      query += ` AND e.approval_status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Add sorting and pagination
    query += ` ORDER BY e.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const { rows } = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE d.company_id = $1
    `;
    
    const countParams = [companyId];
    let countParamIndex = 2;

    if (departmentId) {
      countQuery += ` AND e.department_id = $${countParamIndex++}`;
      countParams.push(departmentId);
    }

    if (status) {
      countQuery += ` AND e.approval_status = $${countParamIndex++}`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Format the response
    const events = rows.map(event => ({
      id: event.event_id,
      name: event.name,
      priority: event.priority,
      eventType: event.event_type,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      status: event.approval_status,
      createdAt: event.created_at
    }));

    res.status(200).json({
      totalItems,
      totalPages,
      currentPage: parseInt(page),
      events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Private (company member)
exports.getEventById = async (req, res, next) => {
  try {
    const eventId = req.params.id;

    // Get event details with related data
    const eventResult = await db.query(
      `SELECT e.event_id, e.name, e.description, e.priority, e.event_type, e.department_id, e.hod_id, 
      e.document_path, e.approval_status, e.rejection_reason, e.created_at,
      d.name as department_name,
      u.full_name as hod_name,
      c.full_name as creator_name
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.hod_id = u.user_id
      LEFT JOIN users c ON e.created_by = c.user_id
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

    // Get assigned employees
    const employeesResult = await db.query(
      `SELECT u.user_id, u.full_name
      FROM event_trackers et
      JOIN users u ON et.user_id = u.user_id
      WHERE et.event_id = $1`,
      [eventId]
    );

    const employees = employeesResult.rows.map(emp => ({
      id: emp.user_id,
      name: emp.full_name
    }));

    // Format document if it exists
    const documents = event.document_path ? [{
      id: 1, // Just a placeholder ID
      name: path.basename(event.document_path),
      url: event.document_path
    }] : [];

    // Get event tasks
    const tasksResult = await db.query(
      `SELECT task_id, name, description, status, created_at
       FROM tasks 
       WHERE event_id = $1
       ORDER BY created_at ASC`,
      [eventId]
    );

    const tasks = tasksResult.rows.map(task => ({
      id: task.task_id,
      name: task.name,
      description: task.description,
      status: task.status
    }));

    res.status(200).json({
      id: event.event_id,
      name: event.name,
      description: event.description,
      priority: event.priority,
      eventType: event.event_type,
      department: {
        id: event.department_id,
        name: event.department_name
      },
      hod: event.hod_id ? {
        id: event.hod_id,
        name: event.hod_name
      } : null,
      creator: {
        name: event.creator_name
      },
      documents,
      employees,
      tasks,
      status: event.approval_status,
      rejectionReason: event.rejection_reason,
      createdAt: event.created_at
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (event creator, company-admin or HOD)
exports.updateEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const { name, description, departmentId, employees, priority, eventType } = req.body;

    // Check if event exists
    const eventCheck = await db.query(
      `SELECT e.*, u.company_id, d.hod_id
       FROM events e
       JOIN users u ON e.created_by = u.user_id
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
    
    // Check authorization
    const isCreator = req.user.user_id === event.created_by;
    const isHod = req.user.user_id === event.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin' && 
                           req.user.company_id === event.company_id;
                         
    if (!isCreator && !isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Handle document upload if provided
    let documentPath = event.document_path;
    if (req.file) {
      // Delete previous document if it exists
      if (documentPath) {
        const oldDocPath = path.join(__dirname, '..', documentPath);
        if (fs.existsSync(oldDocPath)) {
          fs.unlinkSync(oldDocPath);
        }
      }
      documentPath = `/uploads/${req.file.filename}`;
    }

    // Update event
    const result = await db.query(
      `UPDATE events
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           department_id = COALESCE($3, department_id),
           document_path = COALESCE($4, document_path),
           priority = COALESCE($5, priority),
           event_type = COALESCE($6, event_type)
       WHERE event_id = $7
       RETURNING event_id, name, description, department_id, hod_id, document_path, approval_status`,
      [name, description, departmentId, documentPath, priority, eventType, eventId]
    );

    const updatedEvent = result.rows[0];

    // Handle employee assignments if provided
    if (employees && Array.isArray(employees)) {
      // First, remove all existing assignments
      await db.query(
        'DELETE FROM event_trackers WHERE event_id = $1',
        [eventId]
      );

      // Then, add new assignments
      for (const employeeId of employees) {
        await db.query(
          `INSERT INTO event_trackers (event_id, user_id, status)
           VALUES ($1, $2, 'pending')`,
          [eventId, employeeId]
        );
      }
    }

    // Get updated event with all related data
    const fullEventResult = await getFullEventDetails(eventId);

    res.status(200).json(fullEventResult);
  } catch (error) {
    // If there was a file upload and an error occurs, clean up the uploaded file
    if (req.file) {
      fs.unlink(req.file.path, err => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    next(error);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (event creator, company-admin or HOD)
exports.deleteEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;

    // Check if event exists and get creator and HOD info
    const eventCheck = await db.query(
      `SELECT e.*, u.company_id, d.hod_id
       FROM events e
       JOIN users u ON e.created_by = u.user_id
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
    
    // Check authorization
    const isCreator = req.user.user_id === event.created_by;
    const isHod = req.user.user_id === event.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin' && 
                           req.user.company_id === event.company_id;
                         
    if (!isCreator && !isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    // Delete document file if it exists
    if (event.document_path) {
      const docPath = path.join(__dirname, '..', event.document_path);
      if (fs.existsSync(docPath)) {
        fs.unlinkSync(docPath);
      }
    }

    // Delete event (cascade will handle related records in event_trackers)
    await db.query('DELETE FROM events WHERE event_id = $1', [eventId]);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit event for approval
// @route   POST /api/events/:id/submit
// @access  Private (event creator)
exports.submitEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const { approverEmail } = req.body;

    // Check if event exists
    const eventCheck = await db.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = eventCheck.rows[0];
    
    // Check if user is the creator
    if (req.user.user_id !== event.created_by) {
      return res.status(403).json({
        success: false,
        message: 'Only the event creator can submit it for approval'
      });
    }

    // Check if approver exists
    let approverId = null;
    if (approverEmail) {
      const approverCheck = await db.query(
        'SELECT user_id FROM users WHERE email = $1',
        [approverEmail]
      );
      
      if (approverCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Approver not found'
        });
      }
      
      approverId = approverCheck.rows[0].user_id;
    } else {
      // Default to HOD if no approver specified
      approverId = event.hod_id;
    }

    // Update event status
    await db.query(
      'UPDATE events SET approval_status = $1 WHERE event_id = $2',
      ['pending', eventId]
    );

    // TODO: Send notification to approver

    res.status(200).json({
      success: true,
      message: 'Event submitted for approval',
      status: 'pending'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/reject event
// @route   POST /api/events/:id/approve
// @access  Private (approver, company-admin)
exports.approveEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const { approved, comments } = req.body;

    // Check if event exists
    const eventCheck = await db.query(
      `SELECT e.*, d.hod_id, d.company_id
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
    
    // Check authorization
    const isHod = req.user.user_id === event.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin' && 
                          req.user.company_id === event.company_id;
                          
    if (!isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve/reject this event'
      });
    }

    // Update event
    await db.query(
      `UPDATE events 
       SET approval_status = $1,
           rejection_reason = $2,
           approved_by = $3
       WHERE event_id = $4`,
      [approved ? 'approved' : 'rejected', comments, req.user.user_id, eventId]
    );

    // TODO: Send notification to creator

    res.status(200).json({
      success: true,
      message: approved ? 'Event approved' : 'Event rejected',
      status: approved ? 'approved' : 'rejected'
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get full event details
async function getFullEventDetails(eventId) {
  const eventResult = await db.query(
    `SELECT e.event_id, e.name, e.description, e.priority, e.event_type, e.department_id, e.hod_id, 
    e.document_path, e.approval_status, e.rejection_reason, e.created_at,
    d.name as department_name,
    u.full_name as hod_name,
    c.full_name as creator_name
    FROM events e
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN users u ON e.hod_id = u.user_id
    LEFT JOIN users c ON e.created_by = c.user_id
    WHERE e.event_id = $1`,
    [eventId]
  );

  if (eventResult.rows.length === 0) {
    return null;
  }

  const event = eventResult.rows[0];

  // Get assigned employees
  const employeesResult = await db.query(
    `SELECT u.user_id, u.full_name
    FROM event_trackers et
    JOIN users u ON et.user_id = u.user_id
    WHERE et.event_id = $1`,
    [eventId]
  );

  const employees = employeesResult.rows.map(emp => ({
    id: emp.user_id,
    name: emp.full_name
  }));

  // Format document if it exists
  const documents = event.document_path ? [{
    id: 1, // Just a placeholder ID
    name: path.basename(event.document_path),
    url: event.document_path
  }] : [];

  // Get event tasks
  const tasksResult = await db.query(
    `SELECT task_id, name, description, status, created_at
     FROM tasks 
     WHERE event_id = $1
     ORDER BY created_at ASC`,
    [eventId]
  );

  const tasks = tasksResult.rows.map(task => ({
    id: task.task_id,
    name: task.name,
    description: task.description,
    status: task.status
  }));

  return {
    id: event.event_id,
    name: event.name,
    description: event.description,
    priority: event.priority,
    eventType: event.event_type,
    department: {
      id: event.department_id,
      name: event.department_name
    },
    hod: event.hod_id ? {
      id: event.hod_id,
      name: event.hod_name
    } : null,
    creator: {
      name: event.creator_name
    },
    documents,
    employees,
    tasks,
    status: event.approval_status,
    rejectionReason: event.rejection_reason,
    createdAt: event.created_at
  };
}
