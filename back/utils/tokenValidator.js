/**
 * JWT Token Validation Utility
 * Ensures compatibility with frontend token naming and validation
 */
const jwt = require('jsonwebtoken');
const logger = require('./logger');

// These should match the frontend storage keys without the "VITE_" prefix
const TOKEN_NAME = 'raci_auth_token'; // Matches VITE_AUTH_TOKEN_KEY in frontend
const REFRESH_TOKEN_NAME = 'raci_refresh_token'; // Matches VITE_REFRESH_TOKEN_KEY in frontend

/**
 * Validates a JWT token
 * @param {string} token - The token to validate
 * @param {string} secret - The secret used to sign the token
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
const validateToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    logger.error(`Token validation error: ${error.message}`);
    return null;
  }
};

/**
 * Extracts the token from the Authorization header
 * @param {string} authHeader - The Authorization header
 * @returns {string|null} - The token or null if not found/invalid
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
};

module.exports = {
  TOKEN_NAME,
  REFRESH_TOKEN_NAME,
  validateToken,
  extractTokenFromHeader
};
