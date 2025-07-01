import apiService from './api';

/**
 * Service for HOD department management API calls
 */
class HODService {
  /**
   * Get comprehensive department details for HOD
   */
  async getDepartmentDetails() {
    try {
      return apiService.get('/hod/department-details');
    } catch (error) {
      console.error('Error fetching HOD department details:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const hodService = new HODService();
export default hodService; 