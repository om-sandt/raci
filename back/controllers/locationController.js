const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private (company_admin)
exports.getAllLocations = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT location_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM locations WHERE company_id = $1 ORDER BY name ASC',
      [req.user.company_id]
    );

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
// @access  Private (company_admin)
exports.getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      'SELECT location_id as id, name, created_at as "createdAt", updated_at as "updatedAt" FROM locations WHERE location_id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );

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
// @access  Private (company_admin)
exports.createLocation = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    // Check if location already exists for this company
    const existingLocation = await db.query(
      'SELECT location_id FROM locations WHERE LOWER(name) = LOWER($1) AND company_id = $2',
      [name.trim(), req.user.company_id]
    );

    if (existingLocation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Location already exists'
      });
    }

    const { rows } = await db.query(
      'INSERT INTO locations (name, company_id) VALUES ($1, $2) RETURNING location_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), req.user.company_id]
    );

    logger.info(`Location created: ${name} by user ${req.user.user_id} for company ${req.user.company_id}`);

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
// @access  Private (company_admin)
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

    // Check if location exists for this company
    const locationCheck = await db.query(
      'SELECT location_id FROM locations WHERE location_id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );

    if (locationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check if another location with same name exists for this company
    const existingLocation = await db.query(
      'SELECT location_id FROM locations WHERE LOWER(name) = LOWER($1) AND location_id != $2 AND company_id = $3',
      [name.trim(), id, req.user.company_id]
    );

    if (existingLocation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Location with this name already exists'
      });
    }

    const { rows } = await db.query(
      'UPDATE locations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE location_id = $2 AND company_id = $3 RETURNING location_id as id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [name.trim(), id, req.user.company_id]
    );

    logger.info(`Location updated: ${name} by user ${req.user.user_id} for company ${req.user.company_id}`);

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
// @access  Private (company_admin)
exports.deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if location exists for this company
    const locationCheck = await db.query(
      'SELECT location_id FROM locations WHERE location_id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );

    if (locationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    await db.query('DELETE FROM locations WHERE location_id = $1 AND company_id = $2', [id, req.user.company_id]);

    logger.info(`Location deleted: ID ${id} by user ${req.user.user_id} for company ${req.user.company_id}`);

    res.status(200).json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting location: ${error.message}`);
    next(error);
  }
}; 