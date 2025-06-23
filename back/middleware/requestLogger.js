const logger = require('../utils/logger');

// Middleware to log all API requests
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;
  
  // Log request details
  const requestMessage = `${method} ${originalUrl} from ${ip}`;
  logger.http(`REQUEST: ${requestMessage}`);
  
  // Log request body for POST, PUT methods (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    const sensitiveFields = ['password', 'token', 'refreshToken'];
    const filteredBody = { ...req.body };
    
    // Remove sensitive fields from logged body
    sensitiveFields.forEach(field => {
      if (filteredBody[field]) filteredBody[field] = '******';
    });
    
    logger.debug(`Request Body: ${JSON.stringify(filteredBody)}`);
  }
  
  // Capture response data
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log response details
    logger.http(
      `RESPONSE: ${method} ${originalUrl} ${statusCode} - ${responseTime}ms`
    );
    
    // Log error details for 4xx and 5xx responses
    if (statusCode >= 400) {
      let responseBody;
      try {
        if (typeof body === 'string') {
          responseBody = JSON.parse(body);
        } else {
          responseBody = body;
        }
        logger.error(`Response Error: ${JSON.stringify(responseBody)}`);
      } catch (err) {
        logger.error(`Response Error: ${body}`);
      }
    }
    
    return originalSend.apply(res, arguments);
  };
  
  next();
};

module.exports = requestLogger;
