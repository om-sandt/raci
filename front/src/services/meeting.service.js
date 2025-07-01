import apiService from './api';
import env from '../config/env';

/**
 * Service for meeting API calls
 * Updated to match API documentation specification
 */
class MeetingService {
  constructor() {
    this.logPrefix = '[MeetingService]';
  }

  /**
   * Create new meeting
   * POST /api/meetings
   */
  async createMeeting(meetingData) {
    try {
      console.log(`${this.logPrefix} Creating meeting with data:`, meetingData);
      
      // Format data according to API specification
      const formattedData = {
        eventId: parseInt(meetingData.eventId),
        title: meetingData.title,
        description: meetingData.description,
        meetingDate: meetingData.meetingDate, // ISO string format
        guestUserIds: Array.isArray(meetingData.guestUserIds) ? meetingData.guestUserIds : [],
        meetingUrl: meetingData.meetingUrl || ''
      };
      
      console.log(`${this.logPrefix} Formatted create data:`, formattedData);
      
      const response = await apiService.post('/meetings', formattedData);
      
      console.log(`${this.logPrefix} Create meeting response:`, response);
      console.log(`${this.logPrefix} Meeting created successfully with ID:`, response.id);
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error creating meeting:`, error);
      console.error(`${this.logPrefix} Error details:`, {
        message: error.message,
        status: error.status,
        response: error.response
      });
      throw error;
    }
  }
  
  /**
   * Get all meetings with optional filters
   * GET /api/meetings
   */
  async getAllMeetings(filters = {}) {
    try {
      console.log(`${this.logPrefix} Fetching meetings with filters:`, filters);
      
      const queryParams = {};
      
      if (filters.eventId) queryParams.eventId = filters.eventId;
      if (filters.startDate) queryParams.startDate = filters.startDate;
      if (filters.endDate) queryParams.endDate = filters.endDate;
      if (filters.page) queryParams.page = filters.page;
      if (filters.limit) queryParams.limit = filters.limit;
      
      console.log(`${this.logPrefix} Query parameters:`, queryParams);
      
      const response = await apiService.get('/meetings', queryParams);
      
      console.log(`${this.logPrefix} Get meetings response:`, response);
      console.log(`${this.logPrefix} Retrieved ${response.totalItems || response.meetings?.length || 0} meetings`);
      
      // Handle different response formats
      if (response.success !== undefined) {
        console.log(`${this.logPrefix} Response format: API standard with success flag`);
        return response;
      } else if (response.meetings) {
        console.log(`${this.logPrefix} Response format: Direct meetings array with pagination`);
        return {
          success: true,
          ...response
        };
      } else if (Array.isArray(response)) {
        console.log(`${this.logPrefix} Response format: Direct array`);
        return {
          success: true,
          meetings: response,
          totalItems: response.length
        };
      }
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching meetings:`, error);
      console.error(`${this.logPrefix} Error details:`, {
        message: error.message,
        status: error.status,
        response: error.response
      });
      throw error;
    }
  }
  
  /**
   * Get meeting by ID
   * GET /api/meetings/{id}
   */
  async getMeetingById(id) {
    try {
      console.log(`${this.logPrefix} Fetching meeting by ID:`, id);
      
      const response = await apiService.get(`/meetings/${id}`);
      
      console.log(`${this.logPrefix} Get meeting by ID response:`, response);
      console.log(`${this.logPrefix} Meeting details:`, {
        id: response.id,
        title: response.title,
        meetingDate: response.meetingDate,
        eventName: response.event?.name
      });
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching meeting by ID:`, error);
      console.error(`${this.logPrefix} Error details:`, {
        meetingId: id,
        message: error.message,
        status: error.status
      });
      throw error;
    }
  }
  
  /**
   * Update meeting
   * PUT /api/meetings/{id}
   */
  async updateMeeting(id, meetingData) {
    try {
      console.log(`${this.logPrefix} Updating meeting ${id} with data:`, meetingData);
      
      // Format data according to API specification
      const formattedData = {
        eventId: parseInt(meetingData.eventId),
        title: meetingData.title,
        description: meetingData.description,
        meetingDate: meetingData.meetingDate,
        guestUserIds: Array.isArray(meetingData.guestUserIds) ? meetingData.guestUserIds : [],
        meetingUrl: meetingData.meetingUrl || ''
      };
      
      console.log(`${this.logPrefix} Formatted update data:`, formattedData);
      
      const response = await apiService.put(`/meetings/${id}`, formattedData);
      
      console.log(`${this.logPrefix} Update meeting response:`, response);
      console.log(`${this.logPrefix} Meeting ${id} updated successfully`);
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error updating meeting:`, error);
      console.error(`${this.logPrefix} Error details:`, {
        meetingId: id,
        message: error.message,
        status: error.status
      });
      throw error;
    }
  }
  
  /**
   * Delete meeting
   * DELETE /api/meetings/{id}
   */
  async deleteMeeting(id) {
    try {
      console.log(`${this.logPrefix} Deleting meeting with ID:`, id);
      
      const response = await apiService.delete(`/meetings/${id}`);
      
      console.log(`${this.logPrefix} Delete meeting response:`, response);
      console.log(`${this.logPrefix} Meeting ${id} deleted successfully`);
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error deleting meeting:`, error);
      console.error(`${this.logPrefix} Error details:`, {
        meetingId: id,
        message: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Get meetings by date range for calendar view
   * GET /api/meetings/calendar
   */
  async getMeetingsCalendar(startDate, endDate, debug = false) {
    try {
      console.log(`${this.logPrefix} Fetching calendar meetings:`, {
        startDate,
        endDate,
        debug
      });
      
      const queryParams = {
        startDate: startDate,
        endDate: endDate
      };
      
      if (debug) {
        queryParams.debug = 'true';
        console.log(`${this.logPrefix} Debug mode enabled - bypassing company filtering`);
      }
      
      console.log(`${this.logPrefix} Calendar query parameters:`, queryParams);
      
      const response = await apiService.get('/meetings/calendar', queryParams);
      
      console.log(`${this.logPrefix} Calendar meetings response:`, response);
      console.log(`${this.logPrefix} Calendar events found:`, response.calendarEvents?.length || 0);
      console.log(`${this.logPrefix} Calendar meetings found:`, response.meetings?.length || 0);
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching calendar meetings:`, error);
      console.error(`${this.logPrefix} Calendar error details:`, {
        startDate,
        endDate,
        debug,
        message: error.message,
        status: error.status
      });
      
      // Fallback to regular meetings endpoint with date filters
      console.log(`${this.logPrefix} Attempting fallback to regular meetings endpoint...`);
      try {
        const fallbackResponse = await this.getAllMeetings({
          startDate,
          endDate,
          limit: 50
        });
        
        console.log(`${this.logPrefix} Fallback response:`, fallbackResponse);
        
        // Transform to calendar format
        const meetings = fallbackResponse.meetings || [];
        return {
          success: true,
          calendarEvents: meetings.map(meeting => ({
            ...meeting,
            start: meeting.meetingDate || meeting.start
          })),
          meetings: meetings,
          totalItems: meetings.length,
          dateRange: { start: startDate, end: endDate },
          fallbackUsed: true
        };
      } catch (fallbackError) {
        console.error(`${this.logPrefix} Fallback also failed:`, fallbackError);
        throw error; // Throw original error
      }
    }
  }

  /**
   * Get all meetings without company filtering (for debugging)
   * GET /api/meetings/all-raw
   */
  async getAllMeetingsRaw() {
    try {
      console.log(`${this.logPrefix} Fetching all raw meetings for debugging...`);
      
      const response = await apiService.get('/meetings/all-raw');
      
      console.log(`${this.logPrefix} Raw meetings response:`, response);
      console.log(`${this.logPrefix} Raw meetings count:`, response.totalItems || response.meetings?.length || 0);
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching raw meetings:`, error);
      console.error(`${this.logPrefix} Raw meetings error:`, {
        message: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Get comprehensive debug information
   * GET /api/meetings/debug
   */
  async getMeetingsDebugInfo() {
    try {
      console.log(`${this.logPrefix} Fetching meetings debug information...`);
      
      const response = await apiService.get('/meetings/debug');
      
      console.log(`${this.logPrefix} Debug info response:`, response);
      console.log(`${this.logPrefix} User details:`, response.userDetails);
      console.log(`${this.logPrefix} Raw meetings:`, response.totalRawMeetings);
      console.log(`${this.logPrefix} Joined meetings:`, response.totalJoinedMeetings);
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching debug info:`, error);
      console.error(`${this.logPrefix} Debug error:`, {
        message: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Get all events for meeting scheduling
   * GET /api/events
   */
  async getEventsForMeeting() {
    try {
      console.log(`${this.logPrefix} Fetching events for meeting scheduling...`);
      
      const response = await apiService.get('/events', { 
        limit: 100,
        page: 1 
      });
      
      console.log(`${this.logPrefix} Events response:`, response);
      
      // Handle different response formats according to API documentation
      if (response && response.events) {
        console.log(`${this.logPrefix} Events found:`, response.events.length);
        console.log(`${this.logPrefix} Event sample:`, response.events[0]);
        
        return {
          success: true,
          events: response.events,
          totalItems: response.totalItems || response.events.length
        };
      } else if (response && Array.isArray(response)) {
        console.log(`${this.logPrefix} Events array found:`, response.length);
        
        return {
          success: true,
          events: response,
          totalItems: response.length
        };
      } else {
        console.warn(`${this.logPrefix} Unexpected events response structure:`, response);
        return {
          success: false,
          events: [],
          message: 'Unexpected response structure'
        };
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching events:`, error);
      console.error(`${this.logPrefix} Events error:`, {
        message: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Get current company users for guest invitations
   * GET /api/users
   */
  async getUsersForGuests() {
    try {
      console.log(`${this.logPrefix} Fetching users for guest invitations...`);
      
      // Get current user's company information first
      let companyId = null;
      try {
        const currentUserResponse = await apiService.get('/auth/me');
        if (currentUserResponse && currentUserResponse.company) {
          companyId = currentUserResponse.company.id || currentUserResponse.companyId;
          console.log(`${this.logPrefix} Current user company ID:`, companyId);
        }
      } catch (authError) {
        console.warn(`${this.logPrefix} Could not get current user company:`, authError.message);
      }
      
      // Build query parameters
      const queryParams = { 
        limit: 200,
        page: 1 
      };
      
      // Add company filter if available
      if (companyId) {
        queryParams.companyId = companyId;
        console.log(`${this.logPrefix} Filtering users by company ID:`, companyId);
      }
      
      console.log(`${this.logPrefix} Users query parameters:`, queryParams);
      
      const response = await apiService.get('/users', queryParams);
      
      console.log(`${this.logPrefix} Users response:`, response);
      
      // Handle different response formats according to API documentation
      if (response && response.users) {
        console.log(`${this.logPrefix} Users found:`, response.users.length);
        
        // Filter by company if server-side filtering wasn't applied
        let filteredUsers = response.users;
        if (companyId && !queryParams.companyId) {
          filteredUsers = response.users.filter(user => 
            user.company?.id === companyId || 
            user.companyId === companyId
          );
          console.log(`${this.logPrefix} Filtered users to company:`, filteredUsers.length);
        }
        
        console.log(`${this.logPrefix} User sample:`, filteredUsers[0]);
        
        return {
          success: true,
          users: filteredUsers,
          totalItems: filteredUsers.length
        };
      } else if (response && Array.isArray(response)) {
        console.log(`${this.logPrefix} Users array found:`, response.length);
        
        // Filter by company if needed
        let filteredUsers = response;
        if (companyId) {
          filteredUsers = response.filter(user => 
            user.company?.id === companyId || 
            user.companyId === companyId
          );
          console.log(`${this.logPrefix} Filtered users array to company:`, filteredUsers.length);
        }
        
        return {
          success: true,
          users: filteredUsers,
          totalItems: filteredUsers.length
        };
      } else {
        console.warn(`${this.logPrefix} Unexpected users response structure:`, response);
        return {
          success: false,
          users: [],
          message: 'Unexpected response structure'
        };
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching users:`, error);
      console.error(`${this.logPrefix} Users error:`, {
        message: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Get current user's company information
   * GET /api/companies/my-company
   */
  async getCurrentUserCompany() {
    try {
      console.log(`${this.logPrefix} Fetching current user company information...`);
      
      const response = await apiService.get('/companies/my-company');
      
      console.log(`${this.logPrefix} My company response:`, response);
      console.log(`${this.logPrefix} Company details:`, {
        id: response.id,
        name: response.name,
        domain: response.domain
      });
      
      return response;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching current user company:`, error);
      throw error;
    }
  }

  /**
   * Get company departments
   * GET /api/companies/{companyId}/departments
   */
  async getCompanyDepartments(companyId) {
    try {
      console.log(`${this.logPrefix} Fetching departments for company:`, companyId);
      
      const response = await apiService.get(`/companies/${companyId}/departments`);
      
      console.log(`${this.logPrefix} Departments response:`, response);
      console.log(`${this.logPrefix} Departments found:`, response?.length || 0);
      
      if (response && Array.isArray(response)) {
        return { 
          success: true, 
          departments: response 
        };
      }
      
      return { success: false, departments: [] };
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching departments:`, error);
      return { success: false, departments: [] };
    }
  }

  /**
   * Get users by department
   * GET /api/departments/{departmentId}
   */
  async getUsersByDepartment(departmentId) {
    try {
      console.log(`${this.logPrefix} Fetching users for department:`, departmentId);
      
      const response = await apiService.get(`/departments/${departmentId}`);
      
      console.log(`${this.logPrefix} Department users response:`, response);
      console.log(`${this.logPrefix} Department users found:`, response?.employees?.length || 0);
      
      if (response && response.employees) {
        return {
          success: true,
          users: response.employees
        };
      }
      
      return { success: false, users: [] };
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching department users:`, error);
      return { success: false, users: [] };
    }
  }

  /**
   * Helper method to format meeting data for display
   */
  formatMeetingForDisplay(meeting) {
    const formatted = {
      id: meeting.id,
      title: meeting.title || 'Untitled Meeting',
      description: meeting.description || '',
      meetingDate: meeting.meetingDate || meeting.start,
      meetingUrl: meeting.meetingUrl || meeting.url,
      event: {
        id: meeting.event?.id || meeting.eventId,
        name: meeting.event?.name || meeting.eventName || 'Unknown Event'
      },
      department: {
        name: meeting.department?.name || meeting.departmentName || 'N/A'
      },
      guests: meeting.guests || meeting.guestUsers || [],
      createdAt: meeting.createdAt || meeting.created_at,
      updatedAt: meeting.updatedAt || meeting.updated_at
    };
    
    console.log(`${this.logPrefix} Formatted meeting for display:`, formatted);
    return formatted;
  }

  /**
   * Helper method to validate meeting data
   */
  validateMeetingData(meetingData) {
    console.log(`${this.logPrefix} Validating meeting data:`, meetingData);
    
    const errors = [];
    
    if (!meetingData.title || meetingData.title.trim() === '') {
      errors.push('Meeting title is required');
    }
    
    if (!meetingData.eventId) {
      errors.push('Event selection is required');
    }
    
    if (!meetingData.meetingDate) {
      errors.push('Meeting date is required');
    }
    
    // Validate date is not in the past
    if (meetingData.meetingDate) {
      const meetingDate = new Date(meetingData.meetingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (meetingDate < today) {
        errors.push('Meeting date cannot be in the past');
      }
    }
    
    // Validate meeting URL format if provided
    if (meetingData.meetingUrl && meetingData.meetingUrl.trim() !== '') {
      try {
        new URL(meetingData.meetingUrl);
      } catch (e) {
        errors.push('Invalid meeting URL format');
      }
    }
    
    const validation = {
      isValid: errors.length === 0,
      errors: errors
    };
    
    console.log(`${this.logPrefix} Validation result:`, validation);
    return validation;
  }

  /**
   * Helper method to log API response structure for debugging
   */
  logResponseStructure(response, endpoint) {
    console.log(`${this.logPrefix} [${endpoint}] Response structure analysis:`);
    console.log(`${this.logPrefix} [${endpoint}] Type:`, typeof response);
    console.log(`${this.logPrefix} [${endpoint}] Is Array:`, Array.isArray(response));
    console.log(`${this.logPrefix} [${endpoint}] Keys:`, Object.keys(response || {}));
    
    if (response?.meetings) {
      console.log(`${this.logPrefix} [${endpoint}] Meetings array length:`, response.meetings.length);
      if (response.meetings[0]) {
        console.log(`${this.logPrefix} [${endpoint}] Meeting sample keys:`, Object.keys(response.meetings[0]));
      }
    }
    
    if (response?.success !== undefined) {
      console.log(`${this.logPrefix} [${endpoint}] Has success flag:`, response.success);
    }
  }
}

export default new MeetingService();
