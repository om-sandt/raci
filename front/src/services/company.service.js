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
   * Create new company with proper multipart/form-data handling
   * @param {Object} companyData - Company data including name, domain, industry, etc.
   * @param {File} logo - Company logo file
   */
  async createCompany(companyData, logo = null) {
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
   * Update company
   */
  async updateCompany(id, formData, logo) {
    if (logo && logo instanceof File) {
      return apiService.uploadFile(`${env.companiesUrl}/${id}`, logo, {
        ...formData,
        _method: 'PUT'
      });
    } else {
      return apiService.put(`${env.companiesUrl}/${id}`, formData);
    }
  }
  
  /**
   * Update company settings
   */
  async updateCompanySettings(id, settings) {
    return apiService.patch(`${env.companiesUrl}/${id}/settings`, settings);
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
