const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private (company_admin, website_admin)
exports.getAllLocations = async (req, res, next) => {
  try {
    let query, params;
    
    if (req.user.role === 'website_admin') {
      // Website admins can see all locations
      query = 'SELECT location_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM locations ORDER BY name ASC';
      params = [];
    } else {
      // Company admins can only see their company's locations
      query = 'SELECT location_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM locations WHERE company_id = $1 ORDER BY name ASC';
      params = [req.user.company_id];
    }

    const { rows } = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error(`Error getting locations: ${error.message}`);
    next(error);
  }
};

// @desc    Get location by ID
// @route   GET /api/locations/:id
// @access  Private (company_admin, website_admin)
exports.getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query, params;

    if (req.user.role === 'website_admin') {
      // Website admins can see any location
      query = 'SELECT location_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM locations WHERE location_id = $1';
      params = [id];
    } else {
      // Company admins can only see their company's locations
      query = 'SELECT location_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM locations WHERE location_id = $1 AND company_id = $2';
      params = [id, req.user.company_id];
    }

    const { rows } = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error(`Error getting location: ${error.message}`);
    next(error);
  }
};

// @desc    Create new location
// @route   POST /api/locations
// @access  Private (company_admin, website_admin)
exports.createLocation = async (req, res, next) => {
  try {
    const { name, company_id } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    // Determine company_id based on user role
    let targetCompanyId;
    if (req.user.role === 'website_admin') {
      // Website admins can specify company_id or use null for global locations
      targetCompanyId = company_id || null;
    } else {
      // Company admins can only create locations for their own company
      targetCompanyId = req.user.company_id;
    }

    // Check if location already exists for this company
    const existingLocation = await db.query(
      'SELECT location_id FROM locations WHERE LOWER(name) = LOWER($1) AND (company_id = $2 OR (company_id IS NULL AND $2 IS NULL))',
      [name.trim(), targetCompanyId]
    );

    if (existingLocation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Location already exists'
      });
    }

    const { rows } = await db.query(
      'INSERT INTO locations (name, company_id) VALUES ($1, $2) RETURNING location_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), targetCompanyId]
    );

    logger.info(`Location created: ${name} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);

    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error(`Error creating location: ${error.message}`);
    next(error);
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private (company_admin, website_admin)
exports.updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    let locationCheck;
    if (req.user.role === 'website_admin') {
      // Website admins can update any location
      locationCheck = await db.query(
        'SELECT location_id, company_id FROM locations WHERE location_id = $1',
        [id]
      );
    } else {
      // Company admins can only update their company's locations
      locationCheck = await db.query(
        'SELECT location_id, company_id FROM locations WHERE location_id = $1 AND company_id = $2',
        [id, req.user.company_id]
      );
    }

    if (locationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    const location = locationCheck.rows[0];
    const targetCompanyId = location.company_id;

    // Check if another location with same name exists for this company
    const existingLocation = await db.query(
      'SELECT location_id FROM locations WHERE LOWER(name) = LOWER($1) AND location_id != $2 AND (company_id = $3 OR (company_id IS NULL AND $3 IS NULL))',
      [name.trim(), id, targetCompanyId]
    );

    if (existingLocation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Location with this name already exists'
      });
    }

    const { rows } = await db.query(
      'UPDATE locations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE location_id = $2 RETURNING location_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), id]
    );

    logger.info(`Location updated: ${name} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error(`Error updating location: ${error.message}`);
    next(error);
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private (company_admin, website_admin)
exports.deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    let locationCheck;
    if (req.user.role === 'website_admin') {
      // Website admins can delete any location
      locationCheck = await db.query(
        'SELECT location_id, company_id FROM locations WHERE location_id = $1',
        [id]
      );
    } else {
      // Company admins can only delete their company's locations
      locationCheck = await db.query(
        'SELECT location_id, company_id FROM locations WHERE location_id = $1 AND company_id = $2',
        [id, req.user.company_id]
      );
    }

    if (locationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    const location = locationCheck.rows[0];
    const targetCompanyId = location.company_id;

    await db.query('DELETE FROM locations WHERE location_id = $1', [id]);

    logger.info(`Location deleted: ID ${id} by user ${req.user.user_id || req.user.admin_id} for company ${targetCompanyId}`);

    res.status(200).json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting location: ${error.message}`);
    next(error);
  }
}; 