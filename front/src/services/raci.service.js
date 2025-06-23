import apiService from './api';
import env from '../config/env';

/**
 * Service for RACI matrix API calls
 * Note: These endpoints are placeholder implementations and are currently not active in the backend
 */
class RACIService {
  /**
   * Create new RACI matrix
   */
  async createRACIMatrix(matrixData) {
    try {
      return apiService.post('/raci-matrices', matrixData);
    } catch (error) {
      if (error.message.includes('501')) {
        throw new Error('RACI Matrix API is not yet implemented in the backend');
      }
      throw error;
    }
  }
  
  /**
   * Get RACI matrix by ID
   */
  async getRACIMatrixById(id) {
    try {
      return apiService.get(`/raci-matrices/${id}`);
    } catch (error) {
      if (error.message.includes('501')) {
        throw new Error('RACI Matrix API is not yet implemented in the backend');
      }
      throw error;
    }
  }
  
  /**
   * Update RACI matrix
   */
  async updateRACIMatrix(id, matrixData) {
    try {
      return apiService.put(`/raci-matrices/${id}`, matrixData);
    } catch (error) {
      if (error.message.includes('501')) {
        throw new Error('RACI Matrix API is not yet implemented in the backend');
      }
      throw error;
    }
  }
  
  /**
   * Delete RACI matrix
   */
  async deleteRACIMatrix(id) {
    try {
      return apiService.delete(`/raci-matrices/${id}`);
    } catch (error) {
      if (error.message.includes('501')) {
        throw new Error('RACI Matrix API is not yet implemented in the backend');
      }
      throw error;
    }
  }
}

// Create and export a singleton instance
const raciService = new RACIService();
export default raciService;
