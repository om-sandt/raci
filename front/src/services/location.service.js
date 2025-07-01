import apiService from './api';

/**
 * Service for location reference data API calls
 */
class LocationService {
  /**
   * Get all locations
   */
  async getAllLocations() {
    try {
      return apiService.get('/locations');
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  }

  /**
   * Create new location
   */
  async createLocation(locationData) {
    try {
      return apiService.post('/locations', locationData);
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  }

  /**
   * Update location
   */
  async updateLocation(id, locationData) {
    try {
      return apiService.put(`/locations/${id}`, locationData);
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Delete location
   */
  async deleteLocation(id) {
    try {
      return apiService.delete(`/locations/${id}`);
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const locationService = new LocationService();
export default locationService; 