import apiService from './api';
import env from '../config/env';

/**
 * Service for department-related API calls
 */
class DepartmentService {
  /**
   * Get all departments for a company
   */
  async getAllDepartments(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required to get departments');
    }
    return apiService.get(`${env.companiesUrl}/${companyId}/departments`);
  }
  
  /**
   * Get department by ID
   */
  async getDepartmentById(id) {
    if (!id) {
      throw new Error('Department ID is required');
    }
    return apiService.get(`${env.departmentsUrl}/${id}`);
  }
  
  /**
   * Create new department
   */
  async createDepartment(companyId, departmentData) {
    // Validate required fields
    if (!companyId) {
      throw new Error('Company ID is required to create a department');
    }
    
    if (!departmentData.name) {
      throw new Error('Department name is required');
    }
    
    return apiService.post(`${env.companiesUrl}/${companyId}/departments`, departmentData);
  }
  
  /**
   * Update department
   */
  async updateDepartment(id, departmentData) {
    if (!id) {
      throw new Error('Department ID is required');
    }
    
    return apiService.put(`${env.departmentsUrl}/${id}`, departmentData);
  }
  
  /**
   * Delete department
   */
  async deleteDepartment(id) {
    if (!id) {
      throw new Error('Department ID is required');
    }
    
    return apiService.delete(`${env.departmentsUrl}/${id}`);
  }
}

// Create and export a singleton instance
const departmentService = new DepartmentService();
export default departmentService;
