const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Get all designations
// @route   GET /api/designations
// @access  Private (company_admin, website_admin)
exports.getAllDesignations = async (req, res, next) => {
  try {
    let query, params;
    
    if (req.user.role === 'website_admin') {
      // Website admins can see all designations
      query = 'SELECT designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM designations ORDER BY name ASC';
      params = [];
    } else {
      // Company admins can only see their company's designations
      query = 'SELECT designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM designations WHERE company_id = $1 ORDER BY name ASC';
      params = [req.user.company_id];
    }

    const { rows } = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error(`Error getting designations: ${error.message}`);
    next(error);
  }
};

// @desc    Get designation by ID
// @route   GET /api/designations/:id
// @access  Private (company_admin, website_admin)
exports.getDesignationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query, params;

    if (req.user.role === 'website_admin') {
      // Website admins can see any designation
      query = 'SELECT designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM designations WHERE designation_id = $1';
      params = [id];
    } else {
      // Company admins can only see their company's designations
      query = 'SELECT designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM designations WHERE designation_id = $1 AND company_id = $2';
      params = [id, req.user.company_id];
    }

    const { rows } = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error(`Error getting designation: ${error.message}`);
    next(error);
  }
};

// @desc    Create new designation
// @route   POST /api/designations
// @access  Private (company_admin, website_admin)
exports.createDesignation = async (req, res, next) => {
  try {
    const { name, company_id } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Designation name is required'
      });
    }

    // Determine company_id based on user role
    let targetCompanyId;
    if (req.user.role === 'website_admin') {
      // Website admins can specify company_id or use null for global designations
      targetCompanyId = company_id || null;
    } else {
      // Company admins can only create designations for their own company
      targetCompanyId = req.user.company_id;
    }

    // Check if designation already exists for this company
    const existingDesignation = await db.query(
      'SELECT designation_id FROM designations WHERE LOWER(name) = LOWER($1) AND (company_id = $2 OR (company_id IS NULL AND $2 IS NULL))',
      [name.trim(), targetCompanyId]
    );

    if (existingDesignation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Designation already exists'
      });
    }

    const { rows } = await db.query(
      'INSERT INTO designations (name, company_id) VALUES ($1, $2) RETURNING designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), targetCompanyId]
    );

    logger.info(`Designation created: ${name} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);

    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error(`Error creating designation: ${error.message}`);
    next(error);
  }
};

// @desc    Update designation
// @route   PUT /api/designations/:id
// @access  Private (company_admin, website_admin)
exports.updateDesignation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Designation name is required'
      });
    }

    let designationCheck;
    if (req.user.role === 'website_admin') {
      // Website admins can update any designation
      designationCheck = await db.query(
        'SELECT designation_id, company_id FROM designations WHERE designation_id = $1',
        [id]
      );
    } else {
      // Company admins can only update their company's designations
      designationCheck = await db.query(
        'SELECT designation_id, company_id FROM designations WHERE designation_id = $1 AND company_id = $2',
        [id, req.user.company_id]
      );
    }

    if (designationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    const designation = designationCheck.rows[0];
    const targetCompanyId = designation.company_id;

    // Check if another designation with same name exists for this company
    const existingDesignation = await db.query(
      'SELECT designation_id FROM designations WHERE LOWER(name) = LOWER($1) AND designation_id != $2 AND (company_id = $3 OR (company_id IS NULL AND $3 IS NULL))',
      [name.trim(), id, targetCompanyId]
    );

    if (existingDesignation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Designation with this name already exists'
      });
    }

    const { rows } = await db.query(
      'UPDATE designations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE designation_id = $2 RETURNING designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), id]
    );

    logger.info(`Designation updated: ${name} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error(`Error updating designation: ${error.message}`);
    next(error);
  }
};

// @desc    Delete designation
// @route   DELETE /api/designations/:id
// @access  Private (company_admin, website_admin)
exports.deleteDesignation = async (req, res, next) => {
  try {
    const { id } = req.params;

    let designationCheck;
    if (req.user.role === 'website_admin') {
      // Website admins can delete any designation
      designationCheck = await db.query(
        'SELECT designation_id, company_id FROM designations WHERE designation_id = $1',
        [id]
      );
    } else {
      // Company admins can only delete their company's designations
      designationCheck = await db.query(
        'SELECT designation_id, company_id FROM designations WHERE designation_id = $1 AND company_id = $2',
        [id, req.user.company_id]
      );
    }

    if (designationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    const designation = designationCheck.rows[0];
    const targetCompanyId = designation.company_id;

    await db.query('DELETE FROM designations WHERE designation_id = $1', [id]);

    logger.info(`Designation deleted: ID ${id} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);

    res.status(200).json({
      success: true,
      message: 'Designation deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting designation: ${error.message}`);
    next(error);
  }
}; 