import apiService from './api';
import env from '../config/env';

/**
 * Service for website admin API calls
 */
class WebsiteAdminService {
  /**
   * Login as website admin
   */
  async login(email, password) {
    const response = await apiService.post('/website-admins/login', {
      email,
      password
    });
    
    return response;
  }
  
  /**
   * Get all website admins
   */
  async getAllWebsiteAdmins() {
    return apiService.get('/website-admins');
  }
  
  /**
   * Get website admin by ID
   */
  async getWebsiteAdminById(id) {
    return apiService.get(`/website-admins/${id}`);
  }
  
  /**
   * Create new website admin
   */
  async createWebsiteAdmin(adminData) {
    // Validate required fields
    const requiredFields = ['fullName', 'email', 'password', 'phone'];
    for (const field of requiredFields) {
      if (!adminData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return apiService.post('/website-admins', adminData);
  }
  
  /**
   * Update website admin
   */
  async updateWebsiteAdmin(id, adminData) {
    return apiService.put(`/website-admins/${id}`, adminData);
  }
  
  /**
   * Delete website admin
   */
  async deleteWebsiteAdmin(id) {
    return apiService.delete(`/website-admins/${id}`);
  }
  
  /**
   * Get available approvers for company deletion
   * Uses the correct API endpoint as per documentation
   */
  async getAvailableApprovers() {
    try {
      const response = await apiService.get('/companies/deletion-requests/approvers');
      console.log('Available approvers response:', response);
      return response;
    } catch (error) {
      console.error('Failed to fetch available approvers:', error);
      return { success: false, data: [] };
    }
  }
  
  /**
   * Get pending company deletion requests
   * Uses the correct API endpoint as per documentation
   */
  async getPendingDeletionRequests() {
    try {
      const response = await apiService.get('/companies/deletion-requests/pending');
      console.log('Pending deletion requests response:', response);
      return response;
    } catch (error) {
      console.error('Failed to fetch pending deletion requests:', error);
      return { success: false, data: [] };
    }
  }
  
  /**
   * Create company deletion request
   * Uses the correct API endpoint as per documentation
   */
  async createCompanyDeletionRequest(companyId, approverId) {
    try {
      const response = await apiService.post(`/companies/${companyId}/deletion-request`, {
        approverId
      });
      console.log('Create deletion request response:', response);
      return response;
    } catch (error) {
      console.error('Failed to create deletion request:', error);
      throw error;
    }
  }
  
  /**
   * Process company deletion request (approve/reject)
   * Uses the correct API endpoint as per documentation
   */
  async processDeletionRequest(requestId, action, rejectionReason = '') {
    try {
      const requestBody = {
        action,
        rejectionReason
      };
      
      console.log('Processing deletion request:', { requestId, action, rejectionReason });
      
      const response = await apiService.put(`/companies/deletion-requests/${requestId}`, requestBody);
      console.log('Process deletion request response:', response);
      return response;
    } catch (error) {
      console.error('Failed to process deletion request:', error);
      throw error;
    }
  }
  
  /**
   * Get completed company deletion requests history
   * Shows both approved and rejected requests with reasons
   */
  async getCompletedDeletionRequests() {
    try {
      // Use the /all endpoint to get all requests and filter for completed ones
      const response = await apiService.get('/companies/deletion-requests/all');
      console.log('All deletion requests response:', response);
      
      if (response && response.data) {
        const allRequests = Array.isArray(response.data) ? response.data : [];
        const completedRequests = allRequests.filter(req => 
          req.status === 'approved' || req.status === 'rejected'
        );
        return { success: true, data: completedRequests };
      }
      
      return { success: true, data: [] };
    } catch (error) {
      console.error('Failed to fetch completed deletion requests:', error);
      return { success: false, data: [] };
    }
  }
  
  /**
   * Get all deletion requests history (pending + completed)
   * For comprehensive history view
   * Uses the /all endpoint to get all requests
   */
  async getAllDeletionRequestsHistory() {
    try {
      // Use the /all endpoint to get all requests
      const response = await apiService.get('/companies/deletion-requests/all');
      console.log('All deletion requests history response:', response);
      
      if (response && response.data) {
        const allRequests = Array.isArray(response.data) ? response.data : [];
        return { 
          success: true, 
          data: allRequests 
        };
      }
      
      return { success: true, data: [] };
    } catch (error) {
      console.error('Failed to fetch deletion requests history:', error);
      return { success: false, data: [] };
    }
  }
  
  /**
   * Get admin permissions (list of all admins with their permissions)
   */
  async getAdminPermissions() {
    try {
      console.log('Fetching admin permissions from getAllWebsiteAdmins...');
      const response = await this.getAllWebsiteAdmins();
      console.log('Admin permissions via getAllWebsiteAdmins response:', response);
      
      if (response && response.success && response.data) {
        // Transform the data to extract permission information
        const permissions = {};
        response.data.forEach(admin => {
          const adminId = admin.admin_id || admin.id;
          permissions[adminId] = admin.canCreateAdmins || admin.can_create_admins || false;
        });
        
        return {
          success: true,
          data: permissions,
          admins: response.data
        };
      }
      
      return { success: false, data: {} };
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      return { success: false, data: {} };
    }
  }
  
  /**
   * Update admin permissions (grant/revoke permission to create admins)
   * According to API spec: PATCH /api/website-admins/:id/permissions
   * Only omvataliya23@gmail.com can use this endpoint
   */
  async updateAdminPermissions(adminId, canCreateAdmins) {
    try {
      console.log(`Updating permissions for admin ${adminId}: canCreateAdmins=${canCreateAdmins}`);
      console.log('Using API specification endpoint: PATCH /website-admins/:id/permissions');
      
      // Validate that user is authorized (only main admin according to API documentation)
      let userData = localStorage.getItem('current_user') || localStorage.getItem('raci_user');
      const currentUser = userData ? JSON.parse(userData) : {};
      
      if (currentUser.email !== 'omvataliya23@gmail.com') {
        console.warn('Unauthorized attempt to update permissions by:', currentUser.email);
        console.warn('Only omvataliya23@gmail.com can update admin permissions according to API documentation');
        return {
          success: false,
          message: 'Only the main administrator can update admin permissions',
          error: 'UNAUTHORIZED'
        };
      }
      
      // Prepare permission data according to API spec
      const permissionData = {
        canCreateAdmins: canCreateAdmins
      };
      
            console.log('=== PERMISSION UPDATE REQUEST DEBUG ===');
      console.log('Using API specification endpoint: PATCH /website-admins/{id}/permissions');
      console.log('Request payload:', JSON.stringify(permissionData));
      console.log('Admin ID:', adminId);
      console.log('Authorization: Main admin (omvataliya23@gmail.com)');
      
      let response;
      try {
        // Try the dedicated permission endpoint as per API specification
        response = await apiService.patch(`/website-admins/${adminId}/permissions`, permissionData);
        console.log('✅ PATCH permission endpoint successful');
        console.log('API specification endpoint response:', response);
      } catch (patchError) {
        console.log('❌ PATCH permission endpoint failed:', patchError.message);
        
        if (patchError.message.includes('404') || patchError.message.includes('Not Found')) {
          console.log('🔧 FALLBACK: Permission endpoint not implemented yet, using PUT fallback...');
          
          try {
            // Get current admin data first for complete update
            console.log('Fetching current admin data for complete update...');
            const currentAdminResponse = await this.getWebsiteAdminById(adminId);
            let currentAdminData;
            
            if (currentAdminResponse && currentAdminResponse.id) {
              currentAdminData = currentAdminResponse;
            } else if (currentAdminResponse && currentAdminResponse.data) {
              currentAdminData = currentAdminResponse.data;
            } else {
              console.error('Could not fetch current admin data for fallback');
              throw new Error('Could not fetch current admin data for fallback update');
            }
            
            console.log('Current admin data:', currentAdminData);
            
                         // Create complete admin object with updated permission
             // Try both field name formats to ensure compatibility
             const updatedAdminData = {
               fullName: currentAdminData.fullName || currentAdminData.full_name,
               email: currentAdminData.email,
               phone: currentAdminData.phone,
               // Send both field formats to ensure one works
               canCreateAdmins: canCreateAdmins,
               can_create_admins: canCreateAdmins
             };
             
             console.log('🔧 ATTEMPTING PUT with both field formats:', updatedAdminData);
             console.log('🔧 Field formats being sent:');
             console.log('  - canCreateAdmins (camelCase):', canCreateAdmins);
             console.log('  - can_create_admins (snake_case):', canCreateAdmins);
             
             try {
               response = await apiService.put(`/website-admins/${adminId}`, updatedAdminData);
               console.log('✅ PUT endpoint response:', response);
             } catch (putError) {
               console.log('❌ PUT with complete data failed, trying PATCH instead...');
               
               // Try PATCH on the main admin endpoint as alternative
               const patchData = {
                 canCreateAdmins: canCreateAdmins,
                 can_create_admins: canCreateAdmins
               };
               
               console.log('🔧 ATTEMPTING PATCH /website-admins/{id} with permission data:', patchData);
               response = await apiService.patch(`/website-admins/${adminId}`, patchData);
               console.log('✅ PATCH fallback response:', response);
             }
          } catch (putError) {
            console.log('❌ PUT fallback also failed:', putError.message);
            throw putError;
          }
        } else {
          // Re-throw non-404 errors
          throw patchError;
        }
      }
      
      console.log('Permission update successful (via PATCH or PUT fallback):', response);
      console.log('API response data:', JSON.stringify(response, null, 2));
      
      // Verify the updated data includes the permission change
      // Verify response according to API specification
      if (response && response.success && response.data) {
        const updatedPermission = response.data.canCreateAdmins;
        console.log(`✅ API Response verification: Updated admin permission = ${updatedPermission}`);
        console.log('Response format matches API specification:', {
          success: response.success,
          message: response.message,
          data: {
            id: response.data.id,
            fullName: response.data.fullName,
            email: response.data.email,
            canCreateAdmins: response.data.canCreateAdmins,
            updatedAt: response.data.updatedAt
          }
        });
      } else if (response && response.data) {
        // Handle non-standard response format
        const updatedPermission = response.data.canCreateAdmins;
        console.log(`✅ Response verification (non-standard): Updated admin permission = ${updatedPermission}`);
      }
      
      // CRITICAL: Immediate database verification to ensure persistence
      console.log('🔍 CRITICAL: Verifying database update immediately...');
      console.log(`🔍 Expected permission value: ${canCreateAdmins}`);
      console.log(`🔍 Target admin ID: ${adminId}`);
      
      // Wait a moment for database to potentially process the update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        console.log('🔍 Fetching fresh admin data from database...');
        const verificationResponse = await this.getWebsiteAdminById(adminId);
        let verificationData;
        
        if (verificationResponse && verificationResponse.id) {
          verificationData = verificationResponse;
        } else if (verificationResponse && verificationResponse.data) {
          verificationData = verificationResponse.data;
        }
        
        if (verificationData) {
          console.log('🔍 Fresh admin data from DB:', JSON.stringify(verificationData, null, 2));
          
          // Check both field name formats
          const dbPermissionCamel = verificationData.canCreateAdmins;
          const dbPermissionSnake = verificationData.can_create_admins;
          
          console.log(`🔍 Database verification results:`);
          console.log(`  - canCreateAdmins (camelCase): ${dbPermissionCamel}`);
          console.log(`  - can_create_admins (snake_case): ${dbPermissionSnake}`);
          console.log(`  - Expected value: ${canCreateAdmins}`);
          
          const actualPermission = dbPermissionCamel !== undefined ? dbPermissionCamel : dbPermissionSnake;
          
          if (actualPermission === canCreateAdmins) {
            console.log('✅ SUCCESS: Database was updated correctly!');
            console.log('✅ Permission change persisted to database');
            return { ...response, verified: true };
          } else {
            console.log('❌ CRITICAL ERROR: Database was NOT updated!');
            console.log(`❌ Expected: ${canCreateAdmins}, Found: ${actualPermission}`);
            console.log('❌ The API response was successful but database update failed');
            console.log('❌ This suggests a backend database persistence issue');
            
            // Return failure even if API succeeded
            return { 
              success: false, 
              message: 'API call succeeded but database was not updated',
              verified: false,
              expectedValue: canCreateAdmins,
              actualValue: actualPermission
            };
          }
        } else {
          console.log('❌ Could not fetch verification data');
          return { ...response, verified: false, message: 'Could not verify database update' };
        }
      } catch (verificationError) {
        console.log('❌ Database verification failed:', verificationError.message);
        return { ...response, verified: false, message: 'Verification failed: ' + verificationError.message };
      }
      
      return response;
    } catch (error) {
      console.error('Permission update failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
        responseData: error.response?.data,
        responseText: error.response?.text
      });
      
      // Handle specific error cases according to API spec
      let errorMessage = 'Failed to update permissions';
      
      if (error.status === 403) {
        errorMessage = 'Only the main administrator can update admin permissions';
      } else if (error.status === 400) {
        errorMessage = error.response?.data?.message || 'Cannot modify main administrator permissions';
      } else {
        errorMessage = error.response?.data?.message || 
                      error.response?.message || 
                      error.message || 
                      'Failed to update permissions';
      }
      
      return { 
        success: false, 
        message: errorMessage,
        error: error,
        details: `Failed to update permissions for admin ${adminId}. Error: ${errorMessage}`
      };
    }
  }
  
  /**
   * Check if current admin can create other admins
   * According to API documentation:
   * - Main admin (omvataliya23@gmail.com) always has permission
   * - Other admins must have canCreateAdmins permission granted by main admin
   */
  async canCreateAdmins() {
    try {
      console.log('Checking admin creation permissions from current user data...');
      
      // Get current user data from auth service (check both storage keys)
      let userData = localStorage.getItem('current_user') || localStorage.getItem('raci_user');
      const currentUser = userData ? JSON.parse(userData) : {};
      
      // Apply permission logic according to API documentation
      let canCreate = false;
      if (currentUser.email === 'omvataliya23@gmail.com') {
        // Main admin always has permission
        canCreate = true;
        console.log('Main administrator detected - granting permission');
      } else if (currentUser.role === 'website_admin') {
        // Other website admins need explicit permission
        canCreate = currentUser.canCreateAdmins === true;
        console.log(`Website admin permission check: canCreateAdmins = ${currentUser.canCreateAdmins}`);
      } else {
        // Not a website admin
        canCreate = false;
        console.log('User is not a website admin - denying permission');
      }
      
      console.log('Permission check result:', { 
        email: currentUser.email,
        role: currentUser.role,
        canCreateAdmins: currentUser.canCreateAdmins,
        finalDecision: canCreate 
      });
      
      return {
        success: true,
        canCreate: canCreate,
        user: currentUser
      };
    } catch (error) {
      console.error('Error checking admin creation permissions:', error);
      
      // Return a structured error response
      return { 
        success: false, 
        canCreate: false,
        message: error.message || 'Failed to check permissions',
        error: error
      };
    }
  }
}

// Create and export a singleton instance
const websiteAdminService = new WebsiteAdminService();
export default websiteAdminService;
