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
   * Handle API responses
   */
  async handleResponse(response) {
    try {
      let responseData;
      
      if (response.status === 204) {
        responseData = { success: true };
      } else {
        responseData = await response.json();
      }
      
      if (!response.ok) {
        const error = responseData.message || response.statusText;
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
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
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
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
 