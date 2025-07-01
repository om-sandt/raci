import apiService from './api';
import env from '../config/env';

/**
 * Service for user-related API calls
 */
class UserService {
  /**
   * Get all users with filtering and pagination
   */
  async getAllUsers(filters = {}) {
    return apiService.get(env.usersUrl, filters);
  }
  
  /**
   * Get user by ID
   */
  async getUserById(id) {
    if (!id) {
      throw new Error('User ID is required');
    }
    return apiService.get(`${env.usersUrl}/${id}`);
  }
  
  /**
   * Create new user with form data support (for photo uploads)
   * @param {Object} userData - User data
   * @param {File} photo - Photo file (required for company_admin role)
   */
  async createUser(userData, photo = null) {
    // Validate required fields
    const requiredFields = ['name', 'email', 'role'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // For company_admin role, photo is required
    if (userData.role === 'company_admin' && !photo) {
      throw new Error('Photo is required for company admin users');
    }

    // If photo is provided, use form data upload
    if (photo instanceof File) {
      return apiService.uploadFormData(env.usersUrl, 'POST', userData, { photo });
    } else {
      // Use regular JSON API for users without photos
      return apiService.post(env.usersUrl, userData);
    }
  }
  
  /**
   * Update user with form data support (for photo uploads)
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @param {File} photo - Photo file (optional)
   */
  async updateUser(id, userData, photo = null) {
    if (!id) {
      throw new Error('User ID is required');
    }
    
    // If photo is provided, use form data upload
    if (photo instanceof File) {
      return apiService.uploadFormData(`${env.usersUrl}/${id}`, 'PUT', userData, { photo });
    } else {
      // Use regular JSON API for updates without photos
      return apiService.put(`${env.usersUrl}/${id}`, userData);
    }
  }
  
  /**
   * Delete user
   */
  async deleteUser(id) {
    if (!id) {
      throw new Error('User ID is required');
    }
    
    return apiService.delete(`${env.usersUrl}/${id}`);
  }
}

// Create and export a singleton instance
const userService = new UserService();
export default userService;
