const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Get all divisions
// @route   GET /api/divisions
// @access  Private (company_admin, website_admin)
exports.getAllDivisions = async (req, res, next) => {
  try {
    let query, params;
    
    if (req.user.role === 'website_admin') {
      // Website admins can see all divisions
      query = 'SELECT division_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM divisions ORDER BY name ASC';
      params = [];
    } else {
      // Company admins can only see their company's divisions
      query = 'SELECT division_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM divisions WHERE company_id = $1 ORDER BY name ASC';
      params = [req.user.company_id];
    }

    const { rows } = await db.query(query, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    logger.error(`Error getting divisions: ${error.message}`);
    next(error);
  }
};

// @desc    Get division by ID
// @route   GET /api/divisions/:id
// @access  Private (company_admin, website_admin)
exports.getDivisionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query, params;

    if (req.user.role === 'website_admin') {
      // Website admins can see any division
      query = 'SELECT division_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM divisions WHERE division_id = $1';
      params = [id];
    } else {
      // Company admins can only see their company's divisions
      query = 'SELECT division_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM divisions WHERE division_id = $1 AND company_id = $2';
      params = [id, req.user.company_id];
    }

    const { rows } = await db.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Division not found' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error(`Error getting division: ${error.message}`);
    next(error);
  }
};

// @desc    Create new division
// @route   POST /api/divisions
// @access  Private (company_admin, website_admin)
exports.createDivision = async (req, res, next) => {
  try {
    const { name, company_id } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Division name is required' });
    }

    // Determine company_id based on user role
    let targetCompanyId;
    if (req.user.role === 'website_admin') {
      // Website admins can specify company_id or use null for global divisions
      targetCompanyId = company_id || null;
    } else {
      // Company admins can only create divisions for their own company
      targetCompanyId = req.user.company_id;
    }

    // Check if division already exists for this company
    const existingDivision = await db.query(
      'SELECT division_id FROM divisions WHERE LOWER(name) = LOWER($1) AND (company_id = $2 OR (company_id IS NULL AND $2 IS NULL))',
      [name.trim(), targetCompanyId]
    );
    if (existingDivision.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Division already exists' });
    }
    const { rows } = await db.query(
      'INSERT INTO divisions (name, company_id) VALUES ($1, $2) RETURNING division_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), targetCompanyId]
    );
    logger.info(`Division created: ${name} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error(`Error creating division: ${error.message}`);
    next(error);
  }
};

// @desc    Update division
// @route   PUT /api/divisions/:id
// @access  Private (company_admin, website_admin)
exports.updateDivision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Division name is required' });
    }

    let divisionCheck;
    if (req.user.role === 'website_admin') {
      // Website admins can update any division
      divisionCheck = await db.query(
        'SELECT division_id, company_id FROM divisions WHERE division_id = $1',
        [id]
      );
    } else {
      // Company admins can only update their company's divisions
      divisionCheck = await db.query(
        'SELECT division_id, company_id FROM divisions WHERE division_id = $1 AND company_id = $2',
        [id, req.user.company_id]
      );
    }

    if (divisionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Division not found' });
    }

    const division = divisionCheck.rows[0];
    const targetCompanyId = division.company_id;

    // Check if another division with same name exists for this company
    const existingDivision = await db.query(
      'SELECT division_id FROM divisions WHERE LOWER(name) = LOWER($1) AND division_id != $2 AND (company_id = $3 OR (company_id IS NULL AND $3 IS NULL))',
      [name.trim(), id, targetCompanyId]
    );
    if (existingDivision.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Division with this name already exists' });
    }

    const { rows } = await db.query(
      'UPDATE divisions SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE division_id = $2 RETURNING division_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), id]
    );
    logger.info(`Division updated: ${name} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error(`Error updating division: ${error.message}`);
    next(error);
  }
};

// @desc    Delete division
// @route   DELETE /api/divisions/:id
// @access  Private (company_admin, website_admin)
exports.deleteDivision = async (req, res, next) => {
  try {
    const { id } = req.params;

    let divisionCheck;
    if (req.user.role === 'website_admin') {
      // Website admins can delete any division
      divisionCheck = await db.query(
        'SELECT division_id, company_id FROM divisions WHERE division_id = $1',
        [id]
      );
    } else {
      // Company admins can only delete their company's divisions
      divisionCheck = await db.query(
        'SELECT division_id, company_id FROM divisions WHERE division_id = $1 AND company_id = $2',
        [id, req.user.company_id]
      );
    }

    if (divisionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Division not found' });
    }

    const division = divisionCheck.rows[0];
    const targetCompanyId = division.company_id;

    await db.query('DELETE FROM divisions WHERE division_id = $1', [id]);
    logger.info(`Division deleted: ID ${id} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);
    res.status(200).json({ success: true, message: 'Division deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting division: ${error.message}`);
    next(error);
  }
}; 