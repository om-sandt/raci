const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Get comprehensive department details for HOD
// @route   GET /api/hod/department-details
// @access  Private (hod only)
exports.getDepartmentDetails = async (req, res, next) => {
  try {
    const hodId = req.user.user_id;
    
    // Verify the user is a HOD
    if (req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only department heads can access this resource'
      });
    }
    
    // Get department information for the HOD
    const departmentQuery = `
      SELECT d.department_id, d.name, d.created_at, c.company_id, c.name as company_name
      FROM departments d
      JOIN companies c ON d.company_id = c.company_id
      WHERE d.hod_id = $1
    `;
    
    const departmentResult = await db.query(departmentQuery, [hodId]);
    
    if (departmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No departments found where you are the HOD'
      });
    }
    
    const departmentId = departmentResult.rows[0].department_id;
    const department = {
      id: departmentId,
      name: departmentResult.rows[0].name,
      company: {
        id: departmentResult.rows[0].company_id,
        name: departmentResult.rows[0].company_name
      },
      createdAt: departmentResult.rows[0].created_at
    };
    
    // Get all employees in the department
    const employeesQuery = `
      SELECT u.user_id, u.full_name, u.email, u.designation, u.role, u.phone, u.employee_id
      FROM users u
      WHERE u.department_id = $1
      ORDER BY u.full_name
    `;
    
    const employeesResult = await db.query(employeesQuery, [departmentId]);
    
    const employees = employeesResult.rows.map(emp => ({
      id: emp.user_id,
      name: emp.full_name,
      email: emp.email,
      designation: emp.designation,
      role: emp.role,
      phone: emp.phone,
      employeeId: emp.employee_id
    }));
    
    // Get department events
    const eventsQuery = `
      SELECT e.event_id, e.name, e.description, e.approval_status,
      e.created_at, u.full_name as created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1
      ORDER BY e.created_at DESC
    `;
    
    const eventsResult = await db.query(eventsQuery, [departmentId]);
    
    const events = eventsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      description: event.description,
      status: event.approval_status,
      createdBy: event.created_by_name,
      createdAt: event.created_at
    }));
    
    // Get RACI statistics for the department
    const raciStatsQuery = `
      SELECT 
        ra.type, 
        COUNT(DISTINCT ra.user_id) as users_count,
        COUNT(DISTINCT ra.task_id) as tasks_count
      FROM raci_assignments ra
      JOIN tasks t ON ra.task_id = t.task_id
      JOIN events e ON t.event_id = e.event_id
      WHERE e.department_id = $1
      GROUP BY ra.type
    `;
    
    const raciStatsResult = await db.query(raciStatsQuery, [departmentId]);
    
    const raciStats = {
      R: { usersCount: 0, tasksCount: 0 },
      A: { usersCount: 0, tasksCount: 0 },
      C: { usersCount: 0, tasksCount: 0 },
      I: { usersCount: 0, tasksCount: 0 }
    };
    
    raciStatsResult.rows.forEach(row => {
      raciStats[row.type] = {
        usersCount: parseInt(row.users_count),
        tasksCount: parseInt(row.tasks_count)
      };
    });
    
    // Get detailed RACI assignments by event
    const eventRaciQuery = `
      SELECT 
        e.event_id, e.name as event_name,
        t.task_id, t.name as task_name, t.description as task_description,
        ra.type as raci_role, ra.financial_limit_min, ra.financial_limit_max,
        u.user_id, u.full_name, u.email, u.designation
      FROM events e
      JOIN tasks t ON e.event_id = t.event_id
      JOIN raci_assignments ra ON t.task_id = ra.task_id
      JOIN users u ON ra.user_id = u.user_id
      WHERE e.department_id = $1
      ORDER BY e.created_at DESC, t.task_id, ra.type
    `;
    
    const eventRaciResult = await db.query(eventRaciQuery, [departmentId]);
    
    // Process and organize RACI data by event
    const eventRaci = {};
    eventRaciResult.rows.forEach(row => {
      const eventId = row.event_id;
      const taskId = row.task_id;
      
      // Initialize event if not exists
      if (!eventRaci[eventId]) {
        eventRaci[eventId] = {
          id: eventId,
          name: row.event_name,
          tasks: {}
        };
      }
      
      // Initialize task if not exists
      if (!eventRaci[eventId].tasks[taskId]) {
        eventRaci[eventId].tasks[taskId] = {
          id: taskId,
          name: row.task_name,
          description: row.task_description,
          responsible: [],
          accountable: [],
          consulted: [],
          informed: []
        };
      }
      
      // Add user to appropriate RACI category
      const userData = {
        id: row.user_id,
        name: row.full_name,
        email: row.email,
        designation: row.designation,
        financialLimits: row.financial_limit_min || row.financial_limit_max ? {
          min: row.financial_limit_min,
          max: row.financial_limit_max
        } : null
      };
      
      // Add to appropriate role array
      switch(row.raci_role) {
        case 'R':
          eventRaci[eventId].tasks[taskId].responsible.push(userData);
          break;
        case 'A':
          eventRaci[eventId].tasks[taskId].accountable.push(userData);
          break;
        case 'C':
          eventRaci[eventId].tasks[taskId].consulted.push(userData);
          break;
        case 'I':
          eventRaci[eventId].tasks[taskId].informed.push(userData);
          break;
      }
    });
    
    // Convert eventRaci object to array format
    const raciByEvent = Object.values(eventRaci).map(event => {
      return {
        id: event.id,
        name: event.name,
        tasks: Object.values(event.tasks)
      };
    });
    
    // Get pending approvals
    const pendingApprovalsQuery = `
      SELECT e.event_id, e.name, e.created_at, u.full_name as created_by_name
      FROM events e
      JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1 AND e.approval_status = 'pending'
      ORDER BY e.created_at ASC
    `;
    
    const pendingApprovalsResult = await db.query(pendingApprovalsQuery, [departmentId]);
    const pendingApprovals = pendingApprovalsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdBy: event.created_by_name,
      createdAt: event.created_at
    }));
    
    logger.info(`HOD ${req.user.full_name} retrieved comprehensive department details for department ${departmentId}`);
    
    res.status(200).json({
      success: true,
      department,
      statistics: {
        totalEmployees: employees.length,
        totalEvents: events.length,
        pendingApprovals: pendingApprovals.length,
        raciDistribution: raciStats
      },
      employees,
      events,
      pendingApprovals,
      raciByEvent
    });
  } catch (error) {
    logger.error(`Error getting HOD department details: ${error.message}`);
    next(error);
  }
};
