import apiService from './api';
import env from '../config/env';

/**
 * Service for company-related API calls
 */
class CompanyService {
  /**
   * Get all companies with pagination
   */
  async getAllCompanies(page = 1, limit = 10, search = '') {
    const params = { page, limit };
    if (search) params.search = search;
    
    return apiService.get(env.companiesUrl, params);
  }
  
  /**
   * Get company by ID
   */
  async getCompanyById(id) {
    return apiService.get(`${env.companiesUrl}/${id}`);
  }

  /**
   * Get my company (for company admins and HODs)
   */
  async getMyCompany() {
    try {
      return apiService.get(`${env.companiesUrl}/my-company`);
    } catch (error) {
      console.error('Error fetching my company:', error);
      throw error;
    }
  }
  
  /**
   * Create new company with proper multipart/form-data handling
   * @param {Object} companyData - Company data including name, domain, industry, etc.
   * @param {File} logo - Company logo file
   * @param {File} projectLogo - Project logo file
   */
  async createCompany(companyData, logo = null, projectLogo = null) {
    try {
      console.log('Creating company with data:', companyData);
      
      // Instead of using the regular API service, we'll handle the form data manually
      const formData = new FormData();
      
      // Add all company data fields
      Object.keys(companyData).forEach(key => {
        if (companyData[key] !== null && companyData[key] !== undefined) {
          formData.append(key, companyData[key]);
        }
      });
      
      // Add logo if provided
      if (logo instanceof File) {
        formData.append('logo', logo);
      }

      // Add project logo if provided
      if (projectLogo instanceof File) {
        formData.append('project_logo', projectLogo);
      }
      
      // Get the authentication token
      const token = localStorage.getItem(env.authTokenKey);
      
      // Send the request directly using fetch API
      const response = await fetch(`${env.apiBaseUrl}${env.companiesUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('Company creation response status:', response.status);
      
      // Handle the response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create company' }));
        throw new Error(errorData.message || 'Failed to create company');
      }
      
      return response.json();
    } catch (error) {
      console.error('Company creation error:', error);
      throw error;
    }
  }
  
  /**
   * Update company with multipart/form-data handling
   * @param {number} id - Company ID
   * @param {Object} companyData - Company data to update
   * @param {File} logo - Company logo file (optional)
   * @param {File} projectLogo - Project logo file (optional)
   */
  async updateCompany(id, companyData, logo = null, projectLogo = null) {
    try {
      console.log('Updating company with data:', companyData);
      
      const formData = new FormData();
      
      // Add all company data fields
      Object.keys(companyData).forEach(key => {
        if (companyData[key] !== null && companyData[key] !== undefined) {
          formData.append(key, companyData[key]);
        }
      });
      
      // Add logo if provided
      if (logo instanceof File) {
        formData.append('logo', logo);
      }

      // Add project logo if provided
      if (projectLogo instanceof File) {
        formData.append('project_logo', projectLogo);
      }
      
      // Get the authentication token
      const token = localStorage.getItem(env.authTokenKey);
      
      // Send the request directly using fetch API
      const response = await fetch(`${env.apiBaseUrl}${env.companiesUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      // Handle the response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update company' }));
        throw new Error(errorData.message || 'Failed to update company');
      }
      
      return response.json();
    } catch (error) {
      console.error('Company update error:', error);
      throw error;
    }
  }
  
  /**
   * Update company settings
   */
  async updateCompanySettings(id, settings) {
    try {
      return apiService.patch(`${env.companiesUrl}/${id}/settings`, settings);
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  }
  
  /**
   * Delete company
   */
  async deleteCompany(id) {
    return apiService.delete(`${env.companiesUrl}/${id}`);
  }
}

// Create and export a singleton instance
const companyService = new CompanyService();
export default companyService;
