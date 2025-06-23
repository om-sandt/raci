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
   * Create new user
   */
  async createUser(userData) {
    // Validate required fields
    const requiredFields = ['name', 'email', 'role'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return apiService.post(env.usersUrl, userData);
  }
  
  /**
   * Update user
   */
  async updateUser(id, userData) {
    if (!id) {
      throw new Error('User ID is required');
    }
    
    return apiService.put(`${env.usersUrl}/${id}`, userData);
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
