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
          
          // Store user role for easier access
          if (adminData.user && adminData.user.role) {
            localStorage.setItem('user_role', adminData.user.role);
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
          
          // Store user role for easier access
          if (userData.user && userData.user.role) {
            localStorage.setItem('user_role', userData.user.role);
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
      window.location.href = '/auth/login';
    }
  }

  /**
   * Get the current user information
   */
  async getCurrentUser() {
    try {
      return await apiService.get(env.authMeUrl);
    } catch (error) {
      console.error('Get current user error:', error);
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
