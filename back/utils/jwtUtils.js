const jwt = require('jsonwebtoken');
const { TOKEN_NAME, REFRESH_TOKEN_NAME } = require('./tokenValidator');
const logger = require('./logger');

// Generate JWT token
exports.generateToken = (id) => {
  logger.debug(`Generating token for user ID: ${id}`);
  
  // Check if JWT_SECRET is properly set
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not set in environment variables!');
    throw new Error('JWT_SECRET must be configured');
  }
  
  // Generate token with consistent configuration
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
  
  // Log token length for verification
  logger.debug(`Generated token length: ${token.length} chars`);
  
  return token;
};

// Generate refresh token
exports.generateRefreshToken = (id) => {
  logger.debug(`Generating refresh token for user ID: ${id}`);
  
  // Check if REFRESH_TOKEN_SECRET is properly set
  if (!process.env.REFRESH_TOKEN_SECRET) {
    logger.error('REFRESH_TOKEN_SECRET is not set in environment variables!');
    throw new Error('REFRESH_TOKEN_SECRET must be configured');
  }
  
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d'
  });
};

// Verify token compatibility with frontend
exports.verifyTokenSettings = () => {
  logger.info('Verifying JWT token settings for frontend compatibility');
  logger.info(`Access token name: ${TOKEN_NAME}`);
  logger.info(`Refresh token name: ${REFRESH_TOKEN_NAME}`);
  logger.info(`Access token expiry: ${process.env.JWT_EXPIRE || '24h'}`);
  logger.info(`Refresh token expiry: ${process.env.REFRESH_TOKEN_EXPIRE || '7d'}`);
};
