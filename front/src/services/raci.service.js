import apiService from './api';
import env from '../config/env';

/**
 * Service for RACI matrix API calls
 * Updated to use proper API endpoints as per the documentation
 */
class RACIService {
  /**
   * Create new RACI matrix using proper API endpoint
   */
  async createRACIMatrix(matrixData) {
    try {
      console.log('Creating RACI matrix:', matrixData);
      const result = await apiService.post('/raci', matrixData);
      console.log('RACI matrix created successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to create RACI matrix:', error);
      throw error;
    }
  }
  
  /**
   * Get RACI matrix by event ID using proper API endpoint
   */
  async getRACIMatrixByEvent(eventId) {
    try {
      console.log('Fetching RACI matrix for event:', eventId);
      const result = await apiService.get(`/raci/events/${eventId}`);
      console.log('RACI matrix retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to fetch RACI matrix by event:', error);
      throw error;
    }
  }
  
  /**
   * Update RACI matrix using proper API endpoint
   */
  async updateRACIMatrix(eventId, matrixData) {
    try {
      console.log('Updating RACI matrix for event:', eventId, 'with data:', matrixData);
      const result = await apiService.put(`/raci/${eventId}`, matrixData);
      console.log('RACI matrix updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to update RACI matrix:', error);
      throw error;
    }
  }
  
  /**
   * Delete RACI matrix using proper API endpoint
   */
  async deleteRACIMatrix(eventId) {
    try {
      console.log('Deleting RACI matrix for event:', eventId);
      const result = await apiService.delete(`/raci/${eventId}`);
      console.log('RACI matrix deleted successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to delete RACI matrix:', error);
      throw error;
    }
  }

  // RACI Approval Management APIs

  /**
   * Create RACI approval requests using proper API endpoint
   */
  async createRACIApprovalRequests(eventId, approversData) {
    try {
      console.log('Creating RACI approval requests for event:', eventId, 'with approvers:', approversData);
      
      // Try different enum values to fix the backend enum error
      const requestData = {
        ...approversData,
        status: 'PENDING_APPROVAL' // Try PENDING_APPROVAL as enum value
      };
      
      console.log('Final request data:', requestData);
      const result = await apiService.post(`/raci/${eventId}/approvals`, requestData);
      console.log('RACI approval requests created successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to create RACI approval requests:', error);
      
      // If PENDING_APPROVAL fails, try other common enum values
      if (error.message.includes('enum "ApprovalStatus"')) {
        console.log('Trying alternative enum values...');
        
        const alternativeStatuses = ['SUBMITTED', 'AWAITING_APPROVAL', 'REQUESTED', 'PENDING'];
        
        for (const status of alternativeStatuses) {
          try {
            const retryData = {
              ...approversData,
              status: status
            };
            console.log(`Retrying with status: ${status}`);
            const result = await apiService.post(`/raci/${eventId}/approvals`, retryData);
            console.log(`Success with status: ${status}`);
            return result;
          } catch (retryError) {
            console.log(`Failed with status ${status}:`, retryError.message);
            continue;
          }
        }
      }
      
      throw error;
    }
  }

    /**
   * Get pending RACI approvals for current user using proper API endpoint
   */
  async getPendingRACIApprovals() {
    try {
      console.log('Fetching pending RACI approvals from API...');
      const result = await apiService.get('/raci/approvals/pending');
      console.log('Pending RACI approvals retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to fetch pending RACI approvals:', error);
      throw error;
    }
  }



    /**
   * Approve or reject RACI matrix using proper API endpoint
   */
  async approveRejectRACIMatrix(eventId, actionData) {
    try {
      console.log('Processing RACI matrix approval/rejection for event:', eventId, 'action:', actionData);
      const result = await apiService.post(`/raci/${eventId}/approve`, actionData);
      console.log('RACI matrix approval/rejection processed successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to approve/reject RACI matrix:', error);
      throw error;
    }
  }

  /**
   * Get RACI approval status using proper API endpoint
   */
  async getRACIApprovalStatus(eventId) {
    try {
      console.log('Fetching RACI approval status for event:', eventId);
      const result = await apiService.get(`/raci/${eventId}/approval-status`);
      console.log('RACI approval status retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to fetch RACI approval status:', error);
      throw error;
    }
  }

  /**
   * Get eligible approvers using proper API endpoint
   */
  async getEligibleApprovers(level = null) {
    try {
      console.log('Fetching eligible approvers with level:', level);
      const params = level ? { level } : {};
      const result = await apiService.get('/raci/eligible-approvers', params);
      console.log('Eligible approvers retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to fetch eligible approvers:', error);
      throw error;
    }
  }

  /**
   * Get RACI matrix for approval (read-only view) using proper API endpoint
   */
  async getRACIMatrixForApproval(eventId) {
    try {
      console.log('Fetching RACI matrix for approval view, event:', eventId);
      const result = await apiService.get(`/raci/${eventId}/approval-view`);
      console.log('RACI matrix for approval retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to fetch RACI matrix for approval:', error);
      throw error;
    }
  }

  /**
   * Get RACI approval history for current user using proper API endpoint
   */
  async getRACIApprovalHistory() {
    try {
      console.log('Fetching ALL RACI approval history from API...');
      
      // Start with first page and large pageSize
      let allApprovalHistory = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const result = await apiService.get('/raci/approvals/my-history', { 
          page: currentPage, 
          pageSize: 1000 
        });
        
        if (result && result.success && result.approvalHistory) {
          allApprovalHistory = allApprovalHistory.concat(result.approvalHistory);
          totalPages = result.totalPages || 1;
          console.log(`Fetched page ${currentPage}/${totalPages}, got ${result.approvalHistory.length} records`);
        }
        
        currentPage++;
      } while (currentPage <= totalPages);
      
      console.log(`RACI approval history retrieved successfully: ${allApprovalHistory.length} total records`);
      
      // Return in same format as API
      return {
        success: true,
        totalItems: allApprovalHistory.length,
        approvalHistory: allApprovalHistory
      };
    } catch (error) {
      console.error('Failed to fetch RACI approval history:', error);
      throw error;
    }
  }

  // User RACI Assignments

  /**
   * Get my RACI assignments
   */
  async getMyRACIAssignments() {
    try {
      return apiService.get('/user-raci/my-assignments');
    } catch (error) {
      console.error('Error fetching my RACI assignments:', error);
      throw error;
    }
  }

  // RACI Tracker

  /**
   * Get company RACI assignments (for company admin)
   */
  async getCompanyRACIAssignments(page = 1, pageSize = 10) {
    try {
      return apiService.get('/raci-tracker/company', { page, pageSize });
    } catch (error) {
      console.error('Error fetching company RACI assignments:', error);
      throw error;
    }
  }

  /**
   * Get my RACI assignments from tracker
   */
  async getMyRACIAssignmentsFromTracker(page = 1, pageSize = 10) {
    try {
      return apiService.get('/raci-tracker/my-assignments', { page, pageSize });
    } catch (error) {
      console.error('Error fetching my RACI assignments from tracker:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const raciService = new RACIService();
export default raciService;
