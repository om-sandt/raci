/**
 * Environment configuration for the application
 */

const env = {
  // API Configuration - Default to localhost for development
  apiHost: import.meta.env.VITE_HOST || 'localhost:9100',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9100/api',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  
  // Authentication Endpoints
  authLoginUrl: import.meta.env.VITE_AUTH_LOGIN_URL || '/auth/login',
  authWebsiteAdminLoginUrl: import.meta.env.VITE_AUTH_WEBSITE_ADMIN_LOGIN_URL || '/website-admins/login',
  authRefreshTokenUrl: import.meta.env.VITE_AUTH_REFRESH_TOKEN_URL || '/auth/refresh-token',
  authMeUrl: import.meta.env.VITE_AUTH_ME_URL || '/auth/me',
  authLogoutUrl: import.meta.env.VITE_AUTH_LOGOUT_URL || '/auth/logout',
  
  // Authentication Storage Keys
  authTokenKey: import.meta.env.VITE_AUTH_TOKEN_KEY || 'raci_auth_token',
  refreshTokenKey: import.meta.env.VITE_REFRESH_TOKEN_KEY || 'raci_refresh_token',
  
  // User Management Endpoints
  usersUrl: import.meta.env.VITE_USERS_URL || '/users',
  
  // Company Management Endpoints
  companiesUrl: import.meta.env.VITE_COMPANIES_URL || '/companies',
  
  // Department Management Endpoints
  departmentsUrl: import.meta.env.VITE_DEPARTMENTS_URL || '/departments',
  
  // Event Management Endpoints
  eventsUrl: import.meta.env.VITE_EVENTS_URL || '/events',
  
  // Environment
  isDevelopment: import.meta.env.VITE_ENV === 'development',
  isProduction: import.meta.env.VITE_ENV === 'production',
};

export default env;
