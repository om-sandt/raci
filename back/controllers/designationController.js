const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Get all designations
// @route   GET /api/designations
// @access  Private (company_admin)
exports.getAllDesignations = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM designations WHERE company_id = $1 ORDER BY name ASC',
      [req.user.company_id]
    );

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
// @access  Private (company_admin)
exports.getDesignationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      'SELECT designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM designations WHERE designation_id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );

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
// @access  Private (company_admin)
exports.createDesignation = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Designation name is required'
      });
    }

    // Check if designation already exists for this company
    const existingDesignation = await db.query(
      'SELECT designation_id FROM designations WHERE LOWER(name) = LOWER($1) AND company_id = $2',
      [name.trim(), req.user.company_id]
    );

    if (existingDesignation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Designation already exists'
      });
    }

    const { rows } = await db.query(
      'INSERT INTO designations (name, company_id) VALUES ($1, $2) RETURNING designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), req.user.company_id]
    );

    logger.info(`Designation created: ${name} by user ${req.user.user_id} for company ${req.user.company_id}`);

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
// @access  Private (company_admin)
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

    // Check if designation exists for this company
    const designationCheck = await db.query(
      'SELECT designation_id FROM designations WHERE designation_id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );

    if (designationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    // Check if another designation with same name exists for this company
    const existingDesignation = await db.query(
      'SELECT designation_id FROM designations WHERE LOWER(name) = LOWER($1) AND designation_id != $2 AND company_id = $3',
      [name.trim(), id, req.user.company_id]
    );

    if (existingDesignation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Designation with this name already exists'
      });
    }

    const { rows } = await db.query(
      'UPDATE designations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE designation_id = $2 AND company_id = $3 RETURNING designation_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), id, req.user.company_id]
    );

    logger.info(`Designation updated: ${name} by user ${req.user.user_id} for company ${req.user.company_id}`);

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
// @access  Private (company_admin)
exports.deleteDesignation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if designation exists for this company
    const designationCheck = await db.query(
      'SELECT designation_id FROM designations WHERE designation_id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );

    if (designationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    await db.query('DELETE FROM designations WHERE designation_id = $1 AND company_id = $2', [id, req.user.company_id]);

    logger.info(`Designation deleted: ID ${id} by user ${req.user.user_id} for company ${req.user.company_id}`);

    res.status(200).json({
      success: true,
      message: 'Designation deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting designation: ${error.message}`);
    next(error);
  }
}; 