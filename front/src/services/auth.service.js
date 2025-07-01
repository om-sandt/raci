import apiService from './api';
import env from '../config/env';

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Login with email and password - handles both website admin and regular user logins
   */
  async login(email, password) {
    try {
      // Website admin login attempt
      console.log('Attempting website admin login with:', email);
      
      // Use direct fetch for more control over the request
      const adminResponse = await fetch(`${env.apiBaseUrl}/website-admins/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      console.log('Website admin login status:', adminResponse.status);
      
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        console.log('Website admin login successful:', adminData);
        
        if (adminData.token) {
          localStorage.setItem('raci_auth_token', adminData.token);
          
          if (adminData.refreshToken) {
            localStorage.setItem('raci_refresh_token', adminData.refreshToken);
          }
          
          // Store complete user data for website admins including canCreateAdmins field
          if (adminData.user) {
            localStorage.setItem('user_role', adminData.user.role);
            
            // Store complete user data with permissions as per API specification
            const userDataWithPermissions = {
              ...adminData.user,
              // API specification includes these fields in login response
              canCreateAdmins: adminData.user.canCreateAdmins !== undefined 
                ? adminData.user.canCreateAdmins 
                : (adminData.user.email === 'omvataliya23@gmail.com' ? true : false),
              isMainAdmin: adminData.user.isMainAdmin !== undefined 
                ? adminData.user.isMainAdmin 
                : (adminData.user.email === 'omvataliya23@gmail.com' ? true : false)
            };
            
            // Store with both keys for compatibility
            localStorage.setItem('current_user', JSON.stringify(userDataWithPermissions));
            localStorage.setItem('raci_user', JSON.stringify(userDataWithPermissions));
            
            console.log('Stored website admin user data with permissions:', userDataWithPermissions);
          }
        }
        
        // After successful login, store whether this is a default password
        if (adminData && adminData.user && adminData.user.isDefaultPassword) {
          localStorage.setItem('has_default_password', 'true');
        } else {
          localStorage.removeItem('has_default_password');
        }
        
        return adminData;
      }
      
      // If website admin login fails, try regular user login
      console.log('Website admin login failed, trying regular user login');
      const userResponse = await fetch(`${env.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      console.log('Regular user login status:', userResponse.status);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('Regular user login successful:', userData);
        
        if (userData.token) {
          localStorage.setItem('raci_auth_token', userData.token);
          
          if (userData.refreshToken) {
            localStorage.setItem('raci_refresh_token', userData.refreshToken);
          }
          
          // Store user data for regular users
          if (userData.user) {
            localStorage.setItem('user_role', userData.user.role);
            // Store the complete user object
            localStorage.setItem('current_user', JSON.stringify(userData.user));
            console.log('Stored regular user data:', userData.user);
          }
        }
        
        // After successful login, store whether this is a default password
        if (userData && userData.user && userData.user.isDefaultPassword) {
          localStorage.setItem('has_default_password', 'true');
        } else {
          localStorage.removeItem('has_default_password');
        }
        
        return userData;
      }
      
      // If both login attempts fail
      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  /**
   * Store authentication data in local storage
   */
  storeAuthData(response) {
    if (response.token) {
      localStorage.setItem(env.authTokenKey, response.token);
      
      if (response.refreshToken) {
        localStorage.setItem(env.refreshTokenKey, response.refreshToken);
      }
    }
  }

  /**
   * Register a new user
   */
  async register(name, email, password) {
    try {
      const response = await apiService.post(env.authLoginUrl.replace('/login', '/register'), {
        name,
        email,
        password
      });
      
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Request a password reset
   */
  async requestPasswordReset(email) {
    try {
      const response = await apiService.post(env.authLoginUrl.replace('/login', '/forgot-password'), { email });
      return response;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email, otp, purpose = 'verification') {
    try {
      const response = await apiService.post(env.authLoginUrl.replace('/login', '/verify-otp'), {
        email,
        otp,
        purpose
      });
      return response;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(email, password) {
    try {
      const response = await apiService.post(env.authLoginUrl.replace('/login', '/reset-password'), {
        email,
        password
      });
      return response;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Log out the current user
   */
  async logout() {
    try {
      // Call the logout API
      await apiService.post(env.authLogoutUrl);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API success
      localStorage.removeItem(env.authTokenKey);
      localStorage.removeItem(env.refreshTokenKey);
      localStorage.removeItem('current_user'); // Clear stored user data
      localStorage.removeItem('raci_user'); // Clear stored user data (alternate key)
      localStorage.removeItem('user_role'); // Clear stored user role
      localStorage.removeItem('has_default_password'); // Clear default password flag
      window.location.href = '/auth/login';
    }
  }

  /**
   * Get the current user information
   */
  async getCurrentUser() {
    try {
      // First, try to get user data from localStorage (includes canCreateAdmins for website admins)
      // Check both storage keys for compatibility
      let storedUser = localStorage.getItem('current_user') || localStorage.getItem('raci_user');
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('Retrieved user data from localStorage:', userData);
        
        // Ensure permission fields are properly set for website admins according to API specification
        if (userData.role === 'website_admin') {
          userData.canCreateAdmins = userData.canCreateAdmins !== undefined 
            ? userData.canCreateAdmins 
            : (userData.email === 'omvataliya23@gmail.com' ? true : false);
          userData.isMainAdmin = userData.isMainAdmin !== undefined 
            ? userData.isMainAdmin 
            : (userData.email === 'omvataliya23@gmail.com' ? true : false);
        }
        
        return userData;
      }
      
      // If no stored user data, fall back to API call
      console.log('No stored user data, calling API...');
      const userData = await apiService.get(env.authMeUrl);
      
      // Store the user data for future use with proper permissions
      if (userData) {
        const userDataWithPermissions = {
          ...userData,
          canCreateAdmins: userData.canCreateAdmins !== undefined 
            ? userData.canCreateAdmins 
            : (userData.email === 'omvataliya23@gmail.com' ? true : false),
          isMainAdmin: userData.isMainAdmin !== undefined 
            ? userData.isMainAdmin 
            : (userData.email === 'omvataliya23@gmail.com' ? true : false)
        };
        
        localStorage.setItem('current_user', JSON.stringify(userDataWithPermissions));
        localStorage.setItem('raci_user', JSON.stringify(userDataWithPermissions));
        console.log('Stored user data from API with permissions:', userDataWithPermissions);
        
        return userDataWithPermissions;
      }
      
      return userData;
    } catch (error) {
      console.error('Get current user error:', error);
      
      // If API fails, try to return stored user data as fallback
      let storedUser = localStorage.getItem('current_user') || localStorage.getItem('raci_user');
      if (storedUser) {
        console.log('API failed, using stored user data as fallback');
        const userData = JSON.parse(storedUser);
        
        // Ensure permissions are set correctly according to API specification
        if (userData.role === 'website_admin') {
          userData.canCreateAdmins = userData.canCreateAdmins !== undefined 
            ? userData.canCreateAdmins 
            : (userData.email === 'omvataliya23@gmail.com' ? true : false);
          userData.isMainAdmin = userData.isMainAdmin !== undefined 
            ? userData.isMainAdmin 
            : (userData.email === 'omvataliya23@gmail.com' ? true : false);
        }
        
        return userData;
      }
      
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem(env.refreshTokenKey);
      if (!refreshToken) return false;
      
      const response = await apiService.post(env.authRefreshTokenUrl, { refreshToken });
      
      if (response.token) {
        localStorage.setItem(env.authTokenKey, response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem(env.authTokenKey);
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;
