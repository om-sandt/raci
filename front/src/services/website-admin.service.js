import apiService from './api';
import env from '../config/env';

/**
 * Service for website admin API calls
 */
class WebsiteAdminService {
  /**
   * Login as website admin
   */
  async login(email, password) {
    const response = await apiService.post('/website-admins/login', {
      email,
      password
    });
    
    return response;
  }
  
  /**
   * Get all website admins
   */
  async getAllWebsiteAdmins() {
    return apiService.get('/website-admins');
  }
  
  /**
   * Get website admin by ID
   */
  async getWebsiteAdminById(id) {
    return apiService.get(`/website-admins/${id}`);
  }
  
  /**
   * Create new website admin
   */
  async createWebsiteAdmin(adminData) {
    // Validate required fields
    const requiredFields = ['fullName', 'email', 'password', 'phone'];
    for (const field of requiredFields) {
      if (!adminData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return apiService.post('/website-admins', adminData);
  }
  
  /**
   * Update website admin
   */
  async updateWebsiteAdmin(id, adminData) {
    return apiService.put(`/website-admins/${id}`, adminData);
  }
  
  /**
   * Delete website admin
   */
  async deleteWebsiteAdmin(id) {
    return apiService.delete(`/website-admins/${id}`);
  }
}

// Create and export a singleton instance
const websiteAdminService = new WebsiteAdminService();
export default websiteAdminService;
