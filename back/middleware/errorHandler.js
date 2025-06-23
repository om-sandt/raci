const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack);
  
  console.error(err.stack);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
  }

  // PostgreSQL unique constraint error
  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate value. This record already exists.'
    });
  }

  // PostgreSQL foreign key constraint error
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.'
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
};

module.exports = errorHandler;
