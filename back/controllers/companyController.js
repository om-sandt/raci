const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// @desc    Create a new company
// @route   POST /api/companies
// @access  Private (website-admin)
exports.createCompany = async (req, res, next) => {
  try {
    const { name, domain, industry, size, panId, projectName } = req.body;
    let logoUrl = null;
    let projectLogoUrl = null;

    // Handle file uploads (logo & project logo)
    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) {
        logoUrl = `/uploads/${req.files['logo'][0].filename}`;
      }
      // Accept alternative field names from frontend
      else if (req.files['logoUrl'] && req.files['logoUrl'][0]) {
        logoUrl = `/uploads/${req.files['logoUrl'][0].filename}`;
      }
      if (req.files['project_logo'] && req.files['project_logo'][0]) {
        projectLogoUrl = `/uploads/${req.files['project_logo'][0].filename}`;
      }
      // Accept alternative field names from frontend
      else if (req.files['projectLogo'] && req.files['projectLogo'][0]) {
        projectLogoUrl = `/uploads/${req.files['projectLogo'][0].filename}`;
      }
    } else if (req.file) {
      // Backwards compatibility: single 'logo' file field
      logoUrl = `/uploads/${req.file.filename}`;
    }

    // Create company
    const result = await db.query(
      `INSERT INTO companies (name, logo_url, domain, industry, size, pan_id, project_name, project_logo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING company_id, name, logo_url, domain, industry, size, pan_id, project_name, project_logo, created_at`,
      [name, logoUrl, domain, industry, size, panId, projectName, projectLogoUrl]
    );

    const company = result.rows[0];

    res.status(201).json({
      id: company.company_id,
      name: company.name,
      logoUrl: company.logo_url,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      panId: company.pan_id,
      projectName: company.project_name,
      projectLogo: company.project_logo,
      createdAt: company.created_at
    });
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

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private (website-admin)
exports.getCompanies = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    
    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query with search filter
    let query = `
      SELECT c.company_id, c.name, c.logo_url, c.domain, c.industry, c.size, c.pan_id, c.project_name, c.project_logo, c.created_at, c.updated_at,
      COUNT(u.user_id) FILTER (WHERE u.role = 'company_admin') as admins_count
      FROM companies c
      LEFT JOIN users u ON c.company_id = u.company_id
      WHERE c.name ILIKE $1 OR c.domain ILIKE $1
      GROUP BY c.company_id
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const { rows } = await db.query(query, [`%${search}%`, limit, offset]);

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM companies WHERE name ILIKE $1 OR domain ILIKE $1`,
      [`%${search}%`]
    );
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Format response
    const companies = rows.map(company => ({
      id: company.company_id,
      name: company.name,
      logoUrl: company.logo_url,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      panId: company.pan_id,
      projectName: company.project_name,
      projectLogo: company.project_logo,
      adminsCount: parseInt(company.admins_count),
      createdAt: company.created_at,
      updatedAt: company.updated_at
    }));

    res.status(200).json({
      totalItems,
      totalPages,
      currentPage: parseInt(page),
      companies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get company by ID
// @route   GET /api/companies/:id
// @access  Private (website-admin or company member)
exports.getCompanyById = async (req, res, next) => {
  try {
    const companyId = req.params.id;

    const { rows } = await db.query(
      `SELECT company_id, name, logo_url, domain, industry, size, pan_id, project_name, project_logo, created_at, updated_at
      FROM companies
      WHERE company_id = $1`,
      [companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const company = rows[0];

    // For simplicity, we're hardcoding settings here
    // In a real application, this would be stored in a separate table
    const settings = {
      approvalWorkflow: 'sequential',
      defaultApprover: 'department-head',
      allowRejectionFeedback: true,
      notifyOnApproval: true,
      notifyOnRejection: true
    };

    res.status(200).json({
      id: company.company_id,
      name: company.name,
      logoUrl: company.logo_url,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      panId: company.pan_id,
      projectName: company.project_name,
      projectLogo: company.project_logo,
      settings,
      createdAt: company.created_at,
      updatedAt: company.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the company of the logged in company admin or HOD
// @route   GET /api/companies/my-company
// @access  Private (company_admin or hod)
exports.getMyCompany = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    
    if (!companyId) {
      return res.status(404).json({
        success: false,
        message: 'You are not associated with any company'
      });
    }

    const { rows } = await db.query(
      `SELECT company_id, name, logo_url, domain, industry, size, pan_id, project_name, project_logo, created_at, updated_at
      FROM companies
      WHERE company_id = $1`,
      [companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const company = rows[0];

    // Get company statistics
    const userCountResult = await db.query(
      'SELECT COUNT(*) FROM users WHERE company_id = $1',
      [companyId]
    );
    
    const deptCountResult = await db.query(
      'SELECT COUNT(*) FROM departments WHERE company_id = $1',
      [companyId]
    );
    
    const eventCountResult = await db.query(
      `SELECT COUNT(*) FROM events e
       JOIN departments d ON e.department_id = d.department_id
       WHERE d.company_id = $1`,
      [companyId]
    );
    
    // For simplicity, we're hardcoding settings here
    // In a real application, this would be stored in a separate table
    const settings = {
      approvalWorkflow: 'sequential',
      defaultApprover: 'department-head',
      allowRejectionFeedback: true,
      notifyOnApproval: true,
      notifyOnRejection: true
    };

    res.status(200).json({
      id: company.company_id,
      name: company.name,
      logoUrl: company.logo_url,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      panId: company.pan_id,
      projectName: company.project_name,
      projectLogo: company.project_logo,
      settings,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
      stats: {
        totalUsers: parseInt(userCountResult.rows[0].count),
        totalDepartments: parseInt(deptCountResult.rows[0].count),
        totalEvents: parseInt(eventCountResult.rows[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private (website-admin or company-admin)
exports.updateCompany = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const { name, domain, industry, size, panId, projectName } = req.body;
    
    // Check if company exists
    const companyCheck = await db.query(
      'SELECT * FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    let logoUrl = companyCheck.rows[0].logo_url;
    let projectLogoUrl = companyCheck.rows[0].project_logo;

    // Handle file uploads (logo & project logo)
    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) {
        // Delete old logo if exists
        if (logoUrl) {
          const oldLogoPath = path.join(__dirname, '..', logoUrl);
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }
        logoUrl = `/uploads/${req.files['logo'][0].filename}`;
      }
      if (req.files['project_logo'] && req.files['project_logo'][0]) {
        // Delete old project logo if exists
        if (projectLogoUrl) {
          const oldProjectLogoPath = path.join(__dirname, '..', projectLogoUrl);
          if (fs.existsSync(oldProjectLogoPath)) {
            fs.unlinkSync(oldProjectLogoPath);
          }
        }
        projectLogoUrl = `/uploads/${req.files['project_logo'][0].filename}`;
      }
    } else if (req.file) {
      // Backwards compatibility: single 'logo' field
      if (logoUrl) {
        const oldLogoPath = path.join(__dirname, '..', logoUrl);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }
      logoUrl = `/uploads/${req.file.filename}`;
    }

    // Update company
    const result = await db.query(
      `UPDATE companies
      SET name = COALESCE($1, name),
          logo_url = COALESCE($2, logo_url),
          domain = COALESCE($3, domain),
          industry = COALESCE($4, industry),
          size = COALESCE($5, size),
          pan_id = COALESCE($6, pan_id),
          project_name = COALESCE($7, project_name),
          project_logo = COALESCE($8, project_logo),
          updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $9
      RETURNING company_id, name, logo_url, domain, industry, size, pan_id, project_name, project_logo, created_at, updated_at`,
      [name, logoUrl, domain, industry, size, panId, projectName, projectLogoUrl, companyId]
    );

    const company = result.rows[0];

    // For simplicity, we're hardcoding settings here
    // In a real application, this would be stored in a separate table
    const settings = {
      approvalWorkflow: 'sequential',
      defaultApprover: 'department-head',
      allowRejectionFeedback: true,
      notifyOnApproval: true,
      notifyOnRejection: true
    };

    res.status(200).json({
      id: company.company_id,
      name: company.name,
      logoUrl: company.logo_url,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      panId: company.pan_id,
      projectName: company.project_name,
      projectLogo: company.project_logo,
      settings,
      createdAt: company.created_at,
      updatedAt: company.updated_at
    });
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

// @desc    Update company settings
// @route   PATCH /api/companies/:id/settings
// @access  Private (company-admin)
exports.updateCompanySettings = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const {
      approvalWorkflow,
      defaultApprover,
      allowRejectionFeedback,
      notifyOnApproval,
      notifyOnRejection
    } = req.body;

    // Check if company exists
    const companyCheck = await db.query(
      'SELECT * FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // In a real application, we would update a company_settings table
    // For this implementation, we'll just return the company with the "updated" settings

    const company = companyCheck.rows[0];
    
    res.status(200).json({
      id: company.company_id,
      name: company.name,
      logoUrl: company.logo_url,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      settings: {
        approvalWorkflow: approvalWorkflow || 'sequential',
        defaultApprover: defaultApprover || 'department-head',
        allowRejectionFeedback: allowRejectionFeedback !== undefined ? allowRejectionFeedback : true,
        notifyOnApproval: notifyOnApproval !== undefined ? notifyOnApproval : true,
        notifyOnRejection: notifyOnRejection !== undefined ? notifyOnRejection : true
      },
      createdAt: company.created_at,
      updatedAt: company.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private (website-admin)
exports.deleteCompany = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    
    // Check if company exists
    const companyCheck = await db.query(
      'SELECT * FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Delete company logo file if it exists
    const logoUrl = companyCheck.rows[0].logo_url;
    if (logoUrl) {
      const logoPath = path.join(__dirname, '..', logoUrl);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    // Delete project logo file if it exists
    const projectLogoToDelete = companyCheck.rows[0].project_logo;
    if (projectLogoToDelete) {
      const projectLogoPath = path.join(__dirname, '..', projectLogoToDelete);
      if (fs.existsSync(projectLogoPath)) {
        fs.unlinkSync(projectLogoPath);
      }
    }

    // Delete company
    await db.query('DELETE FROM companies WHERE company_id = $1', [companyId]);

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create company deletion request
// @route   POST /api/companies/:id/deletion-request
// @access  Private (website-admin)
exports.createDeletionRequest = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const { approverId, reason } = req.body;
    
    // Validate required fields
    if (!approverId) {
      return res.status(400).json({
        success: false,
        message: 'Approver is required'
      });
    }

    // Check if company exists
    const companyCheck = await db.query(
      'SELECT name FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if approver exists and is different from requester
    const approverCheck = await db.query(
      'SELECT admin_id, full_name FROM website_admins WHERE admin_id = $1',
      [approverId]
    );
    
    if (approverCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Selected approver not found'
      });
    }

    if (parseInt(approverId) === req.user.admin_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot select yourself as approver'
      });
    }

    // Check if there's already a pending deletion request for this company
    const existingRequest = await db.query(
      'SELECT request_id FROM company_deletion_requests WHERE company_id = $1 AND status = $2',
      [companyId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A deletion request for this company is already pending'
      });
    }

    // Create deletion request
    const { rows } = await db.query(
      `INSERT INTO company_deletion_requests (company_id, requested_by, approver_id, reason) 
       VALUES ($1, $2, $3, $4) 
       RETURNING request_id, created_at`,
      [companyId, req.user.admin_id, approverId, reason]
    );

    logger.info(`Company deletion request created: Company ${companyId} by admin ${req.user.admin_id}, approver ${approverId}`);

    res.status(201).json({
      success: true,
      message: 'Deletion request created successfully',
      data: {
        requestId: rows[0].request_id,
        companyName: companyCheck.rows[0].name,
        approverName: approverCheck.rows[0].full_name,
        createdAt: rows[0].created_at
      }
    });
  } catch (error) {
    logger.error(`Error creating deletion request: ${error.message}`);
    next(error);
  }
};

// @desc    Get pending deletion requests for approver
// @route   GET /api/companies/deletion-requests/pending
// @access  Private (website-admin)
exports.getPendingDeletionRequests = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT 
        cdr.request_id,
        cdr.company_id,
        c.name as company_name,
        c.logo_url,
        cdr.reason,
        cdr.created_at,
        wa.full_name as requested_by_name,
        wa.email as requested_by_email
       FROM company_deletion_requests cdr
       JOIN companies c ON cdr.company_id = c.company_id
       JOIN website_admins wa ON cdr.requested_by = wa.admin_id
       WHERE cdr.approver_id = $1 AND cdr.status = 'pending'
       ORDER BY cdr.created_at DESC`,
      [req.user.admin_id]
    );

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error(`Error getting pending deletion requests: ${error.message}`);
    next(error);
  }
};

// @desc    Process deletion request (approve/reject)
// @route   PUT /api/companies/deletion-requests/:requestId
// @access  Private (website-admin)
exports.processDeletionRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { action, rejectionReason } = req.body;

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    // If rejecting, reason is required
    if (action === 'reject' && (!rejectionReason || rejectionReason.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a request'
      });
    }

    // Check if request exists and user is the assigned approver
    const requestCheck = await db.query(
      `SELECT cdr.*, c.name as company_name, c.logo_url, c.project_logo
       FROM company_deletion_requests cdr
       JOIN companies c ON cdr.company_id = c.company_id
       WHERE cdr.request_id = $1 AND cdr.approver_id = $2 AND cdr.status = 'pending'`,
      [requestId, req.user.admin_id]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found or you are not authorized to process it'
      });
    }

    const request = requestCheck.rows[0];

    if (action === 'approve') {
      // Delete company and its associated files
      const logoUrl = request.logo_url;
      if (logoUrl) {
        const logoPath = path.join(__dirname, '..', logoUrl);
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
      }

      const projectLogoToDelete = request.project_logo;
      if (projectLogoToDelete) {
        const projectLogoPath = path.join(__dirname, '..', projectLogoToDelete);
        if (fs.existsSync(projectLogoPath)) {
          fs.unlinkSync(projectLogoPath);
        }
      }

      // Delete company (CASCADE will handle related records)
      await db.query('DELETE FROM companies WHERE company_id = $1', [request.company_id]);
      
      // Update request status
      await db.query(
        'UPDATE company_deletion_requests SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE request_id = $2',
        ['approved', requestId]
      );

      logger.info(`Company ${request.company_id} deleted by admin ${req.user.admin_id} - request ${requestId} approved`);

      res.status(200).json({
        success: true,
        message: 'Company deletion approved and company deleted successfully'
      });
    } else {
      // Reject the request
      await db.query(
        'UPDATE company_deletion_requests SET status = $1, reason = $2, processed_at = CURRENT_TIMESTAMP WHERE request_id = $3',
        ['rejected', rejectionReason, requestId]
      );

      logger.info(`Company deletion request ${requestId} rejected by admin ${req.user.admin_id}`);

      res.status(200).json({
        success: true,
        message: 'Company deletion request rejected successfully'
      });
    }
  } catch (error) {
    logger.error(`Error processing deletion request: ${error.message}`);
    next(error);
  }
};

// @desc    Get other website admins for approval selection
// @route   GET /api/companies/deletion-requests/approvers
// @access  Private (website-admin)
exports.getAvailableApprovers = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT admin_id as id, full_name as name, email FROM website_admins WHERE admin_id != $1 ORDER BY full_name ASC',
      [req.user.admin_id]
    );

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error(`Error getting available approvers: ${error.message}`);
    next(error);
  }
};

// @desc    Get all company deletion requests for website admin dashboard
// @route   GET /api/companies/deletion-requests/all
// @access  Private (website-admin)
exports.getAllDeletionRequests = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT 
        cdr.request_id,
        cdr.company_id,
        c.name as company_name,
        c.logo_url,
        cdr.reason,
        cdr.status,
        cdr.created_at,
        cdr.processed_at,
        cdr.updated_at,
        requester.full_name as requested_by_name,
        requester.email as requested_by_email,
        approver.full_name as approver_name,
        approver.email as approver_email
       FROM company_deletion_requests cdr
       LEFT JOIN companies c ON cdr.company_id = c.company_id
       LEFT JOIN website_admins requester ON cdr.requested_by = requester.admin_id
       LEFT JOIN website_admins approver ON cdr.approver_id = approver.admin_id
       ORDER BY cdr.created_at DESC`,
      []
    );

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error(`Error getting all deletion requests: ${error.message}`);
    next(error);
  }
};
