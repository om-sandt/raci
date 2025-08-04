const db = require('../config/db');
const logger = require('../utils/logger');
const { generateS3Url } = require('../utils/s3Utils');

// @desc    Get website admin dashboard data
// @route   GET /api/dashboard/website-admin
// @access  Private (website_admin)
exports.getWebsiteAdminDashboard = async (req, res, next) => {
  try {
    // Get all companies with their logos and project logos
    const companiesQuery = `
      SELECT c.company_id, c.name, c.logo_url, c.domain, c.industry, c.size, c.pan_id, c.project_name, c.project_logo, c.created_at, c.updated_at,
      COUNT(u.user_id) FILTER (WHERE u.role = 'company_admin') as admins_count,
      COUNT(u.user_id) as total_users
      FROM companies c
      LEFT JOIN users u ON c.company_id = u.company_id
      GROUP BY c.company_id
      ORDER BY c.created_at DESC
      LIMIT 10
    `;
    
    const companiesResult = await db.query(companiesQuery);
    const companies = companiesResult.rows.map(company => ({
      id: company.company_id,
      name: company.name,
      logoUrl: company.logo_url ? generateS3Url(company.logo_url) : null,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      panId: company.pan_id,
      projectName: company.project_name,
      projectLogo: company.project_logo ? generateS3Url(company.project_logo) : null,
      adminsCount: parseInt(company.admins_count),
      totalUsers: parseInt(company.total_users),
      createdAt: company.created_at,
      updatedAt: company.updated_at
    }));

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.company_id) as total_companies,
        COUNT(DISTINCT u.user_id) as total_users,
        COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'company_admin') as total_admins,
        COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'hod') as total_hods,
        COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'user') as total_regular_users
      FROM companies c
      LEFT JOIN users u ON c.company_id = u.company_id
    `;
    
    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];

    // Get recent company deletion requests
    const deletionRequestsQuery = `
      SELECT cdr.request_id, cdr.status, cdr.reason, cdr.created_at,
             c.name as company_name, c.logo_url as company_logo,
             wa.full_name as requested_by_name
      FROM company_deletion_requests cdr
      JOIN companies c ON cdr.company_id = c.company_id
      LEFT JOIN website_admins wa ON cdr.requested_by = wa.admin_id
      ORDER BY cdr.created_at DESC
      LIMIT 5
    `;
    
    const deletionRequestsResult = await db.query(deletionRequestsQuery);
    const deletionRequests = deletionRequestsResult.rows.map(request => ({
      id: request.request_id,
      status: request.status,
      reason: request.reason,
      createdAt: request.created_at,
      company: {
        name: request.company_name,
        logoUrl: request.company_logo ? generateS3Url(request.company_logo) : null
      },
      requestedBy: request.requested_by_name
    }));

    res.status(200).json({
      companies,
      stats: {
        totalCompanies: parseInt(stats.total_companies),
        totalUsers: parseInt(stats.total_users),
        totalAdmins: parseInt(stats.total_admins),
        totalHods: parseInt(stats.total_hods),
        totalRegularUsers: parseInt(stats.total_regular_users)
      },
      deletionRequests
    });
  } catch (error) {
    logger.error(`Error getting website admin dashboard: ${error.message}`);
    next(error);
  }
};

// @desc    Get company admin dashboard data
// @route   GET /api/dashboard/company-admin
// @access  Private (company_admin)
exports.getCompanyAdminDashboard = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    
    // Get company details including project logo
    const companyResult = await db.query(
      'SELECT company_id, name, logo_url, domain, industry, size, pan_id, project_name, project_logo, created_at, updated_at FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    const company = companyResult.rows[0];
    
    // Get company admin user details for profile picture
    const adminUserResult = await db.query(
      'SELECT user_id, full_name, email, photo FROM users WHERE company_id = $1 AND role = $2 LIMIT 1',
      [companyId, 'company_admin']
    );
    
    const adminUser = adminUserResult.rows[0] || null;
    
    // Get user statistics by role
    const userStatsQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE role = 'company_admin') AS company_admin,
        COUNT(*) FILTER (WHERE role = 'hod') AS hod,
        COUNT(*) FILTER (WHERE role = 'user') AS user
      FROM users
      WHERE company_id = $1
    `;
    
    const userStatsResult = await db.query(userStatsQuery, [companyId]);
    const userStats = userStatsResult.rows[0];
    
    // Get department count
    const deptCountQuery = 'SELECT COUNT(*) FROM departments WHERE company_id = $1';
    const deptCountResult = await db.query(deptCountQuery, [companyId]);
    const departmentCount = parseInt(deptCountResult.rows[0].count);
    
    // Get event statistics by status
    const eventStatsQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE e.approval_status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE e.approval_status = 'APPROVED') AS approved,
        COUNT(*) FILTER (WHERE e.approval_status = 'REJECTED') AS rejected
      FROM events e
      JOIN departments d ON e.department_id = d.department_id
      WHERE d.company_id = $1
    `;
    
    const eventStatsResult = await db.query(eventStatsQuery, [companyId]);
    const eventStats = eventStatsResult.rows[0];
    
    // Get recent events
    const recentEventsQuery = `
      SELECT e.event_id, e.name, e.approval_status, e.created_at, d.name as department_name
      FROM events e
      JOIN departments d ON e.department_id = d.department_id
      WHERE d.company_id = $1
      ORDER BY e.created_at DESC
      LIMIT 5
    `;
    
    const recentEventsResult = await db.query(recentEventsQuery, [companyId]);
    const recentEvents = recentEventsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      department: event.department_name,
      status: event.approval_status,
      createdAt: event.created_at
    }));
    
    res.status(200).json({
      company: {
        id: company.company_id,
        name: company.name,
        logoUrl: company.logo_url ? generateS3Url(company.logo_url) : null,
        domain: company.domain,
        industry: company.industry,
        size: company.size,
        panId: company.pan_id,
        projectName: company.project_name,
        projectLogo: company.project_logo ? generateS3Url(company.project_logo) : null,
        createdAt: company.created_at,
        updatedAt: company.updated_at
      },
      adminUser: adminUser ? {
        id: adminUser.user_id,
        name: adminUser.full_name,
        email: adminUser.email,
        profilePicture: adminUser.photo ? generateS3Url(adminUser.photo) : null
      } : null,
      stats: {
        users: {
          total: parseInt(userStats.total),
          company_admin: parseInt(userStats.company_admin),
          hod: parseInt(userStats.hod),
          user: parseInt(userStats.user)
        },
        departments: departmentCount,
        events: {
          total: parseInt(eventStats.total),
          pending: parseInt(eventStats.pending),
          approved: parseInt(eventStats.approved),
          rejected: parseInt(eventStats.rejected)
        }
      },
      recentEvents
    });
  } catch (error) {
    logger.error(`Error getting company admin dashboard: ${error.message}`);
    next(error);
  }
};

// @desc    Get HOD dashboard data
// @route   GET /api/dashboard/hod
// @access  Private (hod)
exports.getHodDashboard = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;
    
    // Get department information with company logos
    const deptQuery = `
      SELECT d.department_id, d.name, c.company_id, c.name as company_name, c.logo_url, c.project_name, c.project_logo
      FROM departments d
      JOIN companies c ON d.company_id = c.company_id
      WHERE d.hod_id = $1
    `;
    
    const deptResult = await db.query(deptQuery, [userId]);
    
    if (deptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found or you are not assigned as HOD'
      });
    }
    
    const department = {
      id: deptResult.rows[0].department_id,
      name: deptResult.rows[0].name,
      company: {
        id: deptResult.rows[0].company_id,
        name: deptResult.rows[0].company_name,
        logoUrl: deptResult.rows[0].logo_url ? generateS3Url(deptResult.rows[0].logo_url) : null,
        projectName: deptResult.rows[0].project_name,
        projectLogo: deptResult.rows[0].project_logo ? generateS3Url(deptResult.rows[0].project_logo) : null
      }
    };
    
    // Get department user count
    const userCountQuery = 'SELECT COUNT(*) FROM users WHERE department_id = $1';
    const userCountResult = await db.query(userCountQuery, [department.id]);
    const userCount = parseInt(userCountResult.rows[0].count);
    
    // Get event statistics for this department
    const eventStatsQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE approval_status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE approval_status = 'APPROVED') AS approved,
        COUNT(*) FILTER (WHERE approval_status = 'REJECTED') AS rejected
      FROM events
      WHERE department_id = $1
    `;
    
    const eventStatsResult = await db.query(eventStatsQuery, [department.id]);
    const eventStats = eventStatsResult.rows[0];
    
    // Get recent events for this department
    const recentEventsQuery = `
      SELECT e.event_id, e.name, e.approval_status, e.created_at, u.full_name as creator_name
      FROM events e
      JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1
      ORDER BY e.created_at DESC
      LIMIT 5
    `;
    
    const recentEventsResult = await db.query(recentEventsQuery, [department.id]);
    const recentEvents = recentEventsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdBy: event.creator_name,
      status: event.approval_status,
      createdAt: event.created_at
    }));
    
    // Get pending approvals
    const pendingApprovalsQuery = `
      SELECT event_id, name, created_at
      FROM events
      WHERE department_id = $1 AND approval_status = 'PENDING'
      ORDER BY created_at ASC
    `;
    
    const pendingApprovalsResult = await db.query(pendingApprovalsQuery, [department.id]);
    const pendingApprovals = pendingApprovalsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdAt: event.created_at
    }));
    
    res.status(200).json({
      department,
      stats: {
        users: userCount,
        events: {
          total: parseInt(eventStats.total),
          pending: parseInt(eventStats.pending),
          approved: parseInt(eventStats.approved),
          rejected: parseInt(eventStats.rejected)
        }
      },
      recentEvents,
      pendingApprovals
    });
  } catch (error) {
    logger.error(`Error getting HOD dashboard: ${error.message}`);
    next(error);
  }
};

// @desc    Get user dashboard data
// @route   GET /api/dashboard/user
// @access  Private (any authenticated user)
exports.getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;
    
    // Get company details including logos
    const companyQuery = `
      SELECT c.company_id, c.name, c.logo_url, c.project_name, c.project_logo
      FROM companies c
      WHERE c.company_id = $1
    `;
    
    const companyResult = await db.query(companyQuery, [companyId]);
    const company = companyResult.rows[0] || null;
    
    // Get events statistics for user's events
    const eventStatsQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE e.approval_status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE e.approval_status = 'APPROVED') AS approved,
        COUNT(*) FILTER (WHERE e.approval_status = 'REJECTED') AS rejected
      FROM events e
      JOIN event_trackers et ON e.event_id = et.event_id
      WHERE et.user_id = $1
    `;
    
    const eventStatsResult = await db.query(eventStatsQuery, [userId]);
    const eventStats = eventStatsResult.rows[0];
    
    // Get recent events assigned to user
    const recentEventsQuery = `
      SELECT e.event_id, e.name, e.approval_status, e.created_at, d.name as department_name
      FROM events e
      JOIN departments d ON e.department_id = d.department_id
      JOIN event_trackers et ON e.event_id = et.event_id
      WHERE et.user_id = $1
      ORDER BY e.created_at DESC
      LIMIT 5
    `;
    
    const recentEventsResult = await db.query(recentEventsQuery, [userId]);
    const recentEvents = recentEventsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      department: event.department_name,
      status: event.approval_status,
      createdAt: event.created_at
    }));
    
    // Get RACI assignments for user
    const raciAssignmentsQuery = `
      SELECT ra.type, COUNT(*) as count
      FROM raci_assignments ra
      WHERE ra.user_id = $1
      GROUP BY ra.type
    `;
    
    const raciAssignmentsResult = await db.query(raciAssignmentsQuery, [userId]);
    
    const raciCounts = {
      responsible: 0,
      accountable: 0,
      consulted: 0,
      informed: 0
    };
    
    raciAssignmentsResult.rows.forEach(row => {
      if (row.type === 'R') raciCounts.responsible = parseInt(row.count);
      if (row.type === 'A') raciCounts.accountable = parseInt(row.count);
      if (row.type === 'C') raciCounts.consulted = parseInt(row.count);
      if (row.type === 'I') raciCounts.informed = parseInt(row.count);
    });
    
    res.status(200).json({
      company: company ? {
        id: company.company_id,
        name: company.name,
        logoUrl: company.logo_url ? generateS3Url(company.logo_url) : null,
        projectName: company.project_name,
        projectLogo: company.project_logo ? generateS3Url(company.project_logo) : null
      } : null,
      stats: {
        events: {
          total: parseInt(eventStats.total),
          pending: parseInt(eventStats.pending),
          approved: parseInt(eventStats.approved),
          rejected: parseInt(eventStats.rejected)
        },
        raci: raciCounts
      },
      recentEvents
    });
  } catch (error) {
    logger.error(`Error getting user dashboard: ${error.message}`);
    next(error);
  }
};

// @desc    Get RACI dashboard data
// @route   GET /api/dashboard/raci
// @access  Private (company_admin or hod)
exports.getRaciDashboard = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const departmentId = req.user.department_id;
    const isCompanyAdmin = req.user.role === 'company_admin';
    
    let eventScope = '';
    let queryParams = [];
    
    if (isCompanyAdmin) {
      // For company admin, get all company data
      eventScope = `
        JOIN departments d ON e.department_id = d.department_id
        WHERE d.company_id = $1
      `;
      queryParams.push(companyId);
    } else {
      // For HOD, get only their department data
      eventScope = 'WHERE e.department_id = $1';
      queryParams.push(departmentId);
    }
    
    // Get RACI statistics
    const raciStatsQuery = `
      SELECT 
        ra.type, 
        COUNT(DISTINCT ra.user_id) as users_count,
        COUNT(DISTINCT ra.task_id) as tasks_count
      FROM raci_assignments ra
      JOIN tasks t ON ra.task_id = t.task_id
      JOIN events e ON t.event_id = e.event_id
      ${eventScope}
      GROUP BY ra.type
    `;
    
    const raciStatsResult = await db.query(raciStatsQuery, queryParams);
    
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
    
    // Get top users with most responsibilities
    const topResponsibleQuery = `
      SELECT u.user_id, u.full_name, COUNT(*) as tasks_count
      FROM raci_assignments ra
      JOIN users u ON ra.user_id = u.user_id
      JOIN tasks t ON ra.task_id = t.task_id
      JOIN events e ON t.event_id = e.event_id
      ${eventScope}
      WHERE ra.type = 'R'
      GROUP BY u.user_id, u.full_name
      ORDER BY tasks_count DESC
      LIMIT 5
    `;
    
    const topResponsibleResult = await db.query(topResponsibleQuery, queryParams);
    const topResponsibleUsers = topResponsibleResult.rows.map(user => ({
      id: user.user_id,
      name: user.full_name,
      tasksCount: parseInt(user.tasks_count)
    }));
    
    // Get events with RACI matrices
    const eventsWithRaciQuery = `
      SELECT e.event_id, e.name, 
        COUNT(DISTINCT ra.task_id) as tasks_with_raci,
        COUNT(DISTINCT ra.user_id) as users_involved
      FROM events e
      JOIN tasks t ON e.event_id = t.event_id
      JOIN raci_assignments ra ON t.task_id = ra.task_id
      ${eventScope}
      GROUP BY e.event_id, e.name
      ORDER BY e.created_at DESC
      LIMIT 5
    `;
    
    const eventsWithRaciResult = await db.query(eventsWithRaciQuery, queryParams);
    const eventsWithRaci = eventsWithRaciResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      tasksWithRaci: parseInt(event.tasks_with_raci),
      usersInvolved: parseInt(event.users_involved)
    }));
    
    res.status(200).json({
      scope: isCompanyAdmin ? 'company' : 'department',
      stats: {
        raci: {
          responsible: raciStats.R,
          accountable: raciStats.A,
          consulted: raciStats.C,
          informed: raciStats.I
        }
      },
      topResponsibleUsers,
      eventsWithRaci
    });
  } catch (error) {
    logger.error(`Error getting RACI dashboard: ${error.message}`);
    next(error);
  }
};
