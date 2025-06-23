const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Create a new department
// @route   POST /api/companies/:companyId/departments
// @access  Private (company_admin)
exports.createDepartment = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { name, hodId } = req.body;
    
    logger.debug(`Creating department with name: ${name} for company ID: ${companyId}`);

    if (!companyId) {
      logger.error('Company ID is missing in request parameters');
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

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

    // Check if head of department exists and belongs to the company (if provided)
    if (hodId) {
      const hodCheck = await db.query(
        'SELECT * FROM users WHERE user_id = $1 AND company_id = $2',
        [hodId, companyId]
      );
      
      if (hodCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid HOD: User not found or not part of this company'
        });
      }
    }

    // Create department (hodId is optional)
    const result = await db.query(
      `INSERT INTO departments (name, hod_id, company_id)
      VALUES ($1, $2, $3)
      RETURNING department_id, name, hod_id, company_id, created_at`,
      [name, hodId || null, companyId]
    );

    const department = result.rows[0];

    // Get HOD details if provided
    let hod = null;
    if (department.hod_id) {
      const hodResult = await db.query(
        'SELECT user_id, full_name FROM users WHERE user_id = $1',
        [department.hod_id]
      );
      
      if (hodResult.rows.length > 0) {
        hod = {
          id: hodResult.rows[0].user_id,
          name: hodResult.rows[0].full_name
        };
      }
    }

    // Get company details
    const companyResult = await db.query(
      'SELECT company_id, name FROM companies WHERE company_id = $1',
      [department.company_id]
    );
    
    const company = {
      id: companyResult.rows[0].company_id,
      name: companyResult.rows[0].name
    };

    logger.info(`Department "${name}" created for company "${company.name}"`);

    res.status(201).json({
      id: department.department_id,
      name: department.name,
      hod,
      company,
      createdAt: department.created_at
    });
  } catch (error) {
    logger.error(`Error creating department: ${error.message}`);
    next(error);
  }
};

// @desc    Get all departments for a company
// @route   GET /api/companies/:companyId/departments
// @access  Private (company member)
exports.getAllDepartments = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    // Get departments with HOD and employee count
    const { rows } = await db.query(
      `SELECT d.department_id, d.name, d.hod_id, d.created_at, d.updated_at,
      u.full_name as hod_name,
      COUNT(e.user_id) FILTER (WHERE e.role = 'user') as employees_count
      FROM departments d
      LEFT JOIN users u ON d.hod_id = u.user_id
      LEFT JOIN users e ON d.department_id = e.department_id
      WHERE d.company_id = $1
      GROUP BY d.department_id, u.full_name
      ORDER BY d.name`,
      [companyId]
    );

    // Format response
    const departments = rows.map(dept => ({
      id: dept.department_id,
      name: dept.name,
      hod: dept.hod_id ? {
        id: dept.hod_id,
        name: dept.hod_name
      } : null,
      employeesCount: parseInt(dept.employees_count),
      createdAt: dept.created_at,
      updatedAt: dept.updated_at
    }));

    res.status(200).json(departments);
  } catch (error) {
    next(error);
  }
};

// @desc    Get department by ID
// @route   GET /api/departments/:id
// @access  Private (company member)
exports.getDepartmentById = async (req, res, next) => {
  try {
    const departmentId = req.params.id;

    // Get department details
    const departmentResult = await db.query(
      `SELECT d.department_id, d.name, d.hod_id, d.company_id,
      u.full_name as hod_name, u.email as hod_email,
      c.name as company_name,
      d.created_at, d.updated_at
      FROM departments d
      LEFT JOIN users u ON d.hod_id = u.user_id
      LEFT JOIN companies c ON d.company_id = c.company_id
      WHERE d.department_id = $1`,
      [departmentId]
    );

    if (departmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const department = departmentResult.rows[0];

    // Get employees in this department
    const employeesResult = await db.query(
      `SELECT user_id, full_name, designation
      FROM users
      WHERE department_id = $1
      ORDER BY full_name`,
      [departmentId]
    );

    // Format response
    const employees = employeesResult.rows.map(emp => ({
      id: emp.user_id,
      name: emp.full_name,
      designation: emp.designation
    }));

    res.status(200).json({
      id: department.department_id,
      name: department.name,
      hod: department.hod_id ? {
        id: department.hod_id,
        name: department.hod_name,
        email: department.hod_email
      } : null,
      company: {
        id: department.company_id,
        name: department.company_name
      },
      employees,
      createdAt: department.created_at,
      updatedAt: department.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (company-admin)
exports.updateDepartment = async (req, res, next) => {
  try {
    const departmentId = req.params.id;
    const { name, hodId } = req.body;

    // Check if department exists
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

    const companyId = departmentCheck.rows[0].company_id;

    // Check if head of department exists and belongs to the company
    if (hodId) {
      const hodCheck = await db.query(
        'SELECT * FROM users WHERE user_id = $1 AND company_id = $2',
        [hodId, companyId]
      );
      
      if (hodCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid HOD: User not found or not part of this company'
        });
      }
    }

    // Update department
    const result = await db.query(
      `UPDATE departments
      SET name = COALESCE($1, name),
          hod_id = COALESCE($2, hod_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE department_id = $3
      RETURNING department_id, name, hod_id, company_id, created_at, updated_at`,
      [name, hodId, departmentId]
    );

    const department = result.rows[0];

    // Get HOD details if provided
    let hod = null;
    if (department.hod_id) {
      const hodResult = await db.query(
        'SELECT user_id, full_name, email FROM users WHERE user_id = $1',
        [department.hod_id]
      );
      
      if (hodResult.rows.length > 0) {
        hod = {
          id: hodResult.rows[0].user_id,
          name: hodResult.rows[0].full_name,
          email: hodResult.rows[0].email
        };
      }
    }

    // Get company details
    const companyResult = await db.query(
      'SELECT company_id, name FROM companies WHERE company_id = $1',
      [department.company_id]
    );
    
    const company = {
      id: companyResult.rows[0].company_id,
      name: companyResult.rows[0].name
    };

    // Get employees in this department
    const employeesResult = await db.query(
      `SELECT user_id, full_name, designation
      FROM users
      WHERE department_id = $1
      ORDER BY full_name`,
      [departmentId]
    );

    const employees = employeesResult.rows.map(emp => ({
      id: emp.user_id,
      name: emp.full_name,
      designation: emp.designation
    }));

    res.status(200).json({
      id: department.department_id,
      name: department.name,
      hod,
      company,
      employees,
      createdAt: department.created_at,
      updatedAt: department.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (company-admin)
exports.deleteDepartment = async (req, res, next) => {
  try {
    const departmentId = req.params.id;
    
    // Check if department exists
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

    // Check if department has users
    const usersCheck = await db.query(
      'SELECT COUNT(*) FROM users WHERE department_id = $1',
      [departmentId]
    );
    
    if (parseInt(usersCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with assigned users'
      });
    }

    // Delete department
    await db.query('DELETE FROM departments WHERE department_id = $1', [departmentId]);

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
