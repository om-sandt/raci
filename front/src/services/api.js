import env from '../config/env';

/**
 * API Service for communicating with the backend
 */
class ApiService {
  constructor() {
    this.baseUrl = env.apiBaseUrl;
    this.timeout = env.apiTimeout;
  }

  /**
   * Get the authentication token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem(env.authTokenKey);
  }

  /**
   * Set authentication headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API responses with better HTML error detection
   */
  async handleResponse(response) {
    try {
      let responseData;
      
      if (response.status === 204) {
        responseData = { success: true };
      } else {
        // Check content type to detect HTML responses
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
          // Handle HTML error pages
          const htmlText = await response.text();
          console.error(`API returned HTML instead of JSON (${response.status}):`, htmlText.substring(0, 200) + '...');
          
          let errorMessage = `Server returned HTML error page (${response.status})`;
          if (response.status === 404) {
            errorMessage = `API endpoint not found (404): ${response.url}`;
          } else if (response.status >= 500) {
            errorMessage = `Server error (${response.status})`;
          }
          
          throw new Error(errorMessage);
        }
        
        // Try to parse as JSON
        try {
          responseData = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, try to get the raw text
          const rawText = await response.text();
          console.error(`Failed to parse JSON response (${response.status}):`, rawText.substring(0, 200) + '...');
          
          if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
            throw new Error(`Server returned HTML instead of JSON (${response.status}). Endpoint may not exist.`);
          }
          
          throw new Error(`Invalid JSON response from server (${response.status}): ${jsonError.message}`);
        }
      }
      
      if (!response.ok) {
        const error = responseData.message || response.statusText || `HTTP ${response.status}`;
        console.error(`API Error (${response.status}): ${error}`);
        throw new Error(error);
      }
      
      return responseData;
    } catch (error) {
      console.error('API response error:', error);
      throw error;
    }
  }
  
  /**
   * Retry a failed request with new token
   */
  async retryRequest(url, method, body) {
    const headers = this.getHeaders();
    
    return fetch(url, {
      method,
      headers,
      body
    });
  }

  /**
   * Perform a GET request
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });
  
      return this.handleResponse(response);
    } catch (error) {
      console.error(`GET request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Perform a POST request
   */
  async post(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
  
      return this.handleResponse(response);
    } catch (error) {
      console.error(`POST request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Perform a PUT request
   */
  async put(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
  
      return this.handleResponse(response);
    } catch (error) {
      console.error(`PUT request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Perform a PATCH request
   */
  async patch(endpoint, data = {}) {
    try {
      const fullUrl = `${this.baseUrl}${endpoint}`;
      const headers = this.getHeaders();
      const body = JSON.stringify(data);
      
      const response = await fetch(fullUrl, {
        method: 'PATCH',
        headers: headers,
        body: body,
      });
  
      return this.handleResponse(response);
    } catch (error) {
      console.error(`PATCH request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Perform a DELETE request
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
  
      return this.handleResponse(response);
    } catch (error) {
      console.error(`DELETE request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Upload files
   * @param {string} endpoint - API endpoint
   * @param {File} file - File to upload (optional)
   * @param {Object} additionalData - Additional form data
   */
  async uploadFile(endpoint, file, additionalData = {}) {
    try {
      const formData = new FormData();
      
      // Add file if provided
      if (file instanceof File) {
        formData.append('logo', file);
      }
      
      // Add any additional data
      Object.keys(additionalData).forEach(key => {
        if (additionalData[key] !== null && additionalData[key] !== undefined) {
          if (Array.isArray(additionalData[key])) {
            additionalData[key].forEach(item => {
              formData.append(`${key}[]`, item);
            });
          } else {
            formData.append(key, additionalData[key]);
          }
        }
      });
      
      const headers = {};
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error(`File upload failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Upload form data with files
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (POST, PUT, PATCH)
   * @param {Object} data - Form data object
   * @param {Object} files - Files object with key-value pairs
   */
  async uploadFormData(endpoint, method = 'POST', data = {}, files = {}) {
    try {
      const formData = new FormData();
      
      // Add all data fields
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          if (Array.isArray(data[key])) {
            data[key].forEach(item => {
              formData.append(`${key}[]`, item);
            });
          } else {
            formData.append(key, data[key]);
          }
        }
      });
      
      // Add all files
      Object.keys(files).forEach(key => {
        if (files[key] instanceof File) {
          formData.append(key, files[key]);
        }
      });
      
      const headers = {};
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: method.toUpperCase(),
        headers,
        body: formData,
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Form data upload failed for ${endpoint}:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
 