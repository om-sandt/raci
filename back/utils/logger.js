const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File transports
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    }),
    // Separate file for API requests
    new winston.transports.File({ 
      filename: path.join(logDir, 'requests.log'),
      level: 'http'
    })
  ]
});

/**
 * Simple logger utility for the application
 */
const utilsLogger = {
  info: (message) => {
    logger.info(message);
  },
  error: (message) => {
    logger.error(message);
  },
  debug: (message) => {
    logger.debug(message);
  },
  warn: (message) => {
    logger.warn(message);
  },
  // Add http method to handle HTTP requests logging
  http: (message) => {
    logger.http(message);
  },
  // Generic log method
  log: (level, message) => {
    logger.log(level, message);
  }
};

module.exports = utilsLogger;
