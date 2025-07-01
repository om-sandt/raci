import apiService from './api';

/**
 * Service for designation reference data API calls
 */
class DesignationService {
  /**
   * Get all designations
   */
  async getAllDesignations() {
    try {
      return apiService.get('/designations');
    } catch (error) {
      console.error('Error fetching designations:', error);
      throw error;
    }
  }

  /**
   * Create new designation
   */
  async createDesignation(designationData) {
    try {
      return apiService.post('/designations', designationData);
    } catch (error) {
      console.error('Error creating designation:', error);
      throw error;
    }
  }

  /**
   * Update designation
   */
  async updateDesignation(id, designationData) {
    try {
      return apiService.put(`/designations/${id}`, designationData);
    } catch (error) {
      console.error('Error updating designation:', error);
      throw error;
    }
  }

  /**
   * Delete designation
   */
  async deleteDesignation(id) {
    try {
      return apiService.delete(`/designations/${id}`);
    } catch (error) {
      console.error('Error deleting designation:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const designationService = new DesignationService();
export default designationService; 