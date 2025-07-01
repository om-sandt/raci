import apiService from './api';

/**
 * Service for dashboard and analytics API calls
 */
class DashboardService {
  /**
   * Get website admin dashboard stats
   */
  async getWebsiteAdminDashboard() {
    try {
      return apiService.get('/dashboard/website-admin');
    } catch (error) {
      console.error('Error fetching website admin dashboard:', error);
      if (error.message.includes('501')) {
        throw new Error('Website Admin Dashboard API is not yet implemented in the backend');
      }
      throw error;
    }
  }

  /**
   * Get company admin dashboard stats
   */
  async getCompanyAdminDashboard() {
    try {
      return apiService.get('/dashboard/company-admin');
    } catch (error) {
      console.error('Error fetching company admin dashboard:', error);
      throw error;
    }
  }

  /**
   * Get HOD dashboard stats
   */
  async getHODDashboard() {
    try {
      return apiService.get('/dashboard/hod');
    } catch (error) {
      console.error('Error fetching HOD dashboard:', error);
      throw error;
    }
  }

  /**
   * Get user dashboard stats
   */
  async getUserDashboard() {
    try {
      return apiService.get('/dashboard/user');
    } catch (error) {
      console.error('Error fetching user dashboard:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const dashboardService = new DashboardService();
export default dashboardService; 