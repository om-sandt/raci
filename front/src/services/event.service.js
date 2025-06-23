import apiService from './api';
import env from '../config/env';

/**
 * Service for event-related API calls
 */
class EventService {
  /**
   * Get all events with filtering and pagination
   */
  async getAllEvents(filters = {}) {
    return apiService.get(env.eventsUrl, filters);
  }
  
  /**
   * Get event by ID
   */
  async getEventById(id) {
    if (!id) {
      throw new Error('Event ID is required');
    }
    return apiService.get(`${env.eventsUrl}/${id}`);
  }
  
  /**
   * Create new event
   * @param {Object} eventData - Event data including name, description, departmentId
   * @param {File} document - Document file for the event (optional)
   * @param {Array} employees - Array of employee IDs (optional)
   */
  async createEvent(eventData, document = null) {
    // Validate required fields
    if (!eventData.name || !eventData.departmentId) {
      throw new Error('Event name and department ID are required');
    }
    
    // Make a copy of the eventData to avoid modifying the original
    const data = { ...eventData };
    
    // Handle employees array if it exists
    if (data.employees && Array.isArray(data.employees)) {
      data.employees = JSON.stringify(data.employees);
    }
    
    return apiService.uploadFile(env.eventsUrl, document, data);
  }
  
  /**
   * Update event
   */
  async updateEvent(id, eventData, document = null) {
    if (!id) {
      throw new Error('Event ID is required');
    }
    
    // Make a copy of the eventData to avoid modifying the original
    const data = { ...eventData };
    
    // Handle employees array if it exists
    if (data.employees && Array.isArray(data.employees)) {
      data.employees = JSON.stringify(data.employees);
    }
    
    if (document && document instanceof File) {
      return apiService.uploadFile(`${env.eventsUrl}/${id}`, document, {
        ...data,
        _method: 'PUT'
      });
    } else {
      return apiService.put(`${env.eventsUrl}/${id}`, data);
    }
  }
  
  /**
   * Delete event
   */
  async deleteEvent(id) {
    if (!id) {
      throw new Error('Event ID is required');
    }
    
    return apiService.delete(`${env.eventsUrl}/${id}`);
  }
  
  /**
   * Submit event for approval
   */
  async submitEventForApproval(id, approverEmail) {
    if (!id) {
      throw new Error('Event ID is required');
    }
    
    if (!approverEmail) {
      throw new Error('Approver email is required');
    }
    
    return apiService.post(`${env.eventsUrl}/${id}/submit`, { approverEmail });
  }
  
  /**
   * Approve or reject event
   */
  async approveEvent(id, approved, comments = '') {
    if (!id) {
      throw new Error('Event ID is required');
    }
    
    return apiService.post(`${env.eventsUrl}/${id}/approve`, { 
      approved, 
      comments 
    });
  }
}

// Create and export a singleton instance
const eventService = new EventService();
export default eventService;
