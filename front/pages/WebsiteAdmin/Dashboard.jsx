import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/dashboard.scss';
import CreateCompany from './CreateCompany';
import CreateCompanyAdmin from './CreateCompanyAdmin';
import CreateAdmin from './CreateAdmin';
import EditCompany from './EditCompany';
import EditCompanyAdmin from './EditCompanyAdmin';
import EditAdmin from './EditAdmin';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import websiteAdminService from '../../src/services/website-admin.service';
import env from '../../src/config/env';

const WebsiteAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyAdmins, setCompanyAdmins] = useState([]);
  const [loadingCompanyAdmins, setLoadingCompanyAdmins] = useState(false);
  const [newCompanyAdminsThisMonth, setNewCompanyAdminsThisMonth] = useState(0);
  const [totalCompanyAdmins, setTotalCompanyAdmins] = useState(0);
  const [totalWebsiteAdmins, setTotalWebsiteAdmins] = useState(0);
  
  // Approval system states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [loadingApproval, setLoadingApproval] = useState(false);
  
  // Company deletion request states
  const [showDeletionRequestModal, setShowDeletionRequestModal] = useState(false);
  const [selectedCompanyForDeletion, setSelectedCompanyForDeletion] = useState(null);
  const [availableApprovers, setAvailableApprovers] = useState([]);
  const [selectedApproverId, setSelectedApproverId] = useState('');
  const [loadingDeletionRequest, setLoadingDeletionRequest] = useState(false);
  
  // Permission management states
  const [showPermissionsSection, setShowPermissionsSection] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  
  // Add state for current user's permissions
  const [currentUserCanCreate, setCurrentUserCanCreate] = useState(false);
  
  // History and tracking states
  const [completedRequests, setCompletedRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistorySection, setShowHistorySection] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // pending, completed, all
  
  // Load user data and check permissions
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoadingUser(true);
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        
        // Check if current user can create admins
        setCurrentUserCanCreate(userData?.canCreateAdmins || false);
        
        console.log('Current user data:', userData);
        console.log('User can create admins:', userData?.canCreateAdmins);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoadingUser(false);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      // Load pending approvals
      await fetchPendingApprovals();
      
      // Always load full history once on mount (ensures proper maintenance for deletion records page)
      await fetchAllRequestsHistory();
    };
    
    loadInitialData();
  }, []);

  // Load data when navigating to deletion records page
  useEffect(() => {
    if (location.pathname === '/website-admin/deletion-records') {
      // Ensure data is loaded when accessing the deletion records page
      if (pendingApprovals.length === 0 && completedRequests.length === 0) {
        fetchAllRequestsHistory();
      }
    }
  }, [location.pathname, pendingApprovals.length, completedRequests.length]);

  // Redirect logic
  useEffect(() => {
    if (location.pathname === '/website-admin' || location.pathname === '/website-admin/') {
      navigate('/website-admin/dashboard', { replace: true });
    }
  }, [location.pathname]);

  // Load analytics data
  useEffect(() => {
    // Fetch analytics data from API
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      setAnalyticsError('');
      
      try {
        // Try to fetch from API first
        const data = await apiService.get('/dashboard/website-admin');
        const analyticsData = data && data.data ? data.data : data;
        setAnalytics(analyticsData);
        console.log('Analytics loaded from API:', analyticsData);
      } catch (err) {
        console.log('API error:', err);
        
        // If API fails (501 Not Implemented), fetch company data directly
        try {
          const companiesResponse = await apiService.get('/companies');
          console.log('Companies response:', companiesResponse);
          
          // Extract company data from response
          let companies = [];
          if (companiesResponse.companies) {
            companies = companiesResponse.companies;
          } else if (Array.isArray(companiesResponse)) {
            companies = companiesResponse;
          } else if (companiesResponse && typeof companiesResponse === 'object') {
            companies = [companiesResponse];
          }
          
          console.log('Processed companies list:', companies);
          
          // Debug log to check industry and size fields
          companies.forEach(company => {
            console.log(`Company ${company.name} - Industry: ${company.industry}, Size: ${company.size}`);
          });
          
          setCompanies(companies);
          
          // Calculate new companies this month
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const newCompaniesThisMonth = companies.filter(company => {
            const createdAt = new Date(company.createdAt);
            return createdAt >= firstDayOfMonth;
          }).length;
          
          // Update analytics with accurate new companies count
          setAnalytics(prev => ({
            ...prev,
            newCompaniesThisMonth,
            totalCompanies: companies.length,
            // totalAdmins handled in admin fetch effect
          }));
        } catch (companyErr) {
          console.error('Failed to fetch companies data:', companyErr);
          setAnalyticsError('Failed to load analytics');
        }
      } finally {
        setLoadingAnalytics(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  // Load companies data with proper function definition - making it accessible elsewhere
  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await apiService.get('/companies');
      console.log('Companies response details:', response);
      
      // Extract the companies array based on the response structure
      let companiesList = [];
      if (response.companies) {
        companiesList = response.companies;
      } else if (Array.isArray(response)) {
        companiesList = response;
      } else if (typeof response === 'object' && response !== null) {
        companiesList = [response]; // Handle single company object response
      }
      
      console.log('Processed companies list:', companiesList);
      
      // Debug log to check industry and size fields
      companiesList.forEach(company => {
        console.log(`Company ${company.name} - Industry: ${company.industry}, Size: ${company.size}`);
      });
      
      setCompanies(companiesList);
      
      // Calculate new companies this month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newCompaniesThisMonth = companiesList.filter(company => {
        const createdAt = new Date(company.createdAt);
        return createdAt >= firstDayOfMonth;
      }).length;
      
      // Update analytics with accurate new companies count
      setAnalytics(prev => ({
        ...prev,
        newCompaniesThisMonth,
        totalCompanies: companiesList.length,
        // totalAdmins handled in admin fetch effect
      }));
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Refresh data when returning to the dashboard
  useEffect(() => {
    // Check if we're on the dashboard route and if we have a state indicating update needed
    if (location.pathname.includes('/dashboard') && location.state?.refreshData) {
      fetchCompanies();
      fetchTotalWebsiteAdmins(); // Refresh website admins count too
      // Clear the state to prevent unnecessary refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);
  
  // Load companies data on component mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Load admins data is now handled by fetchTotalWebsiteAdmins
  
  // Load pending approvals and available approvers
  useEffect(() => {
    fetchPendingApprovals();
    fetchAvailableApprovers();
  }, []);
  
  // Fetch total website admins count and details
  const fetchTotalWebsiteAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const response = await websiteAdminService.getAllWebsiteAdmins();
      console.log('Website admins response:', response);
      
      // Handle different response formats
      let adminsData = [];
      if (Array.isArray(response)) {
        adminsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        adminsData = response.data;
      }
      
      setAdmins(adminsData); // Store full admin details
      setTotalWebsiteAdmins(adminsData.length);
      
      // Also update analytics with website admins count
      setAnalytics(prev => ({ 
        ...(prev || {}), 
        totalWebsiteAdmins: adminsData.length 
      }));
      
      // Fetch permissions if user is main admin and has admins data
      if (currentUser?.email === 'omvataliya23@gmail.com' && adminsData.length > 0) {
        // Small delay to ensure admins state is updated
        setTimeout(() => {
          fetchAdminPermissions();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to fetch website admins:', error);
      setAdmins([]);
      setTotalWebsiteAdmins(0);
    } finally {
      setLoadingAdmins(false);
    }
  };
  
  // Load website admins count
  useEffect(() => {
    fetchTotalWebsiteAdmins();
  }, []);

  // Fetch company admins when a company is selected
  useEffect(() => {
    const fetchCompanyAdmins = async () => {
      if (!selectedCompanyId) {
        setCompanyAdmins([]);
        return;
      }
      
      try {
        setLoadingCompanyAdmins(true);
        
        // Use the appropriate API endpoint with query parameters according to the API documentation
        // /users endpoint supports companyId and role query params
        const endpoint = `/users?companyId=${selectedCompanyId}&role=company_admin`;
        console.log(`Fetching company admins using: ${endpoint}`);
        
        const response = await apiService.get(endpoint);
        console.log('Company admins API response:', response);
        
        // Handle different possible response formats based on API docs
        let adminsData = [];
        
        if (response && response.users) {
          // Standard paginated response as per API docs
          adminsData = response.users;
        } else if (Array.isArray(response)) {
          // Direct array response
          adminsData = response;
        } else if (response && typeof response === 'object' && !Array.isArray(response)) {
          // Single user object response
          if (response.id) {
            adminsData = [response];
          }
          // Try to extract from other common response patterns
          else if (Array.isArray(response.data)) {
            adminsData = response.data;
          } else if (response.totalItems && Array.isArray(response.users)) {
            adminsData = response.users;
          }
        }
        
        console.log(`Found ${adminsData.length} company admins for company ID ${selectedCompanyId}:`, adminsData);
        
        // Ensure we have the correct data structure
        const formattedAdmins = adminsData.map(admin => {
          // More detailed debugging for phone number properties
          console.log('Admin raw data:', admin);
          console.log('Phone fields:', { 
            phone: admin.phone, 
            phoneNumber: admin.phoneNumber, 
            contactNumber: admin.contactNumber,
            mobileNumber: admin.mobileNumber,
            contact: admin.contact && admin.contact.phone,
            nestedPhone: admin.contact && admin.contact.number
          });
          
          // Extract phone number with extended checking for nested properties
          const phoneNumber = 
            admin.phone || 
            admin.phoneNumber || 
            admin.contactNumber || 
            admin.mobileNumber || 
            (admin.contact && admin.contact.phone) || 
            (admin.contact && admin.contact.number) ||
            (typeof admin.phone === 'number' && String(admin.phone));
          
          // Ensure we don't display "null" or "undefined" as strings
          const sanitizedPhone = phoneNumber && phoneNumber !== "null" && phoneNumber !== "undefined" 
            ? phoneNumber 
            : '';
            
          return {
            id: admin.id,
            name: admin.name || 'Unknown',
            email: admin.email || '-',
            phone: sanitizedPhone || '-', // Sanitized phone value
            designation: admin.designation || 'Company Administrator',
            role: admin.role || 'company_admin',
            photo: admin.photo || admin.photoUrl || admin.profilePhoto || ''
          };
        });
        
        setCompanyAdmins(formattedAdmins);
      } catch (error) {
        console.error('Failed to fetch company admins:', error);
        // Try direct users API as fallback
        try {
          console.log('Trying fallback approach to get company admins...');
          const allUsers = await apiService.get('/users');
          console.log('All users response:', allUsers);
          
          let usersList = [];
          if (allUsers && allUsers.users) {
            usersList = allUsers.users;
          } else if (Array.isArray(allUsers)) {
            usersList = allUsers;
          }
          
          // Manual filtering
          const companyAdminUsers = usersList.filter(user => {
            const userRole = (user.role || '').toLowerCase();
            const userCompanyId = user.companyId || (user.company && user.company.id);
            
            console.log(`Checking user ${user.name || 'Unknown'}: role=${userRole}, companyId=${userCompanyId}, selectedCompany=${selectedCompanyId}`);
            
            return String(userCompanyId) === String(selectedCompanyId) && 
                   (userRole === 'company_admin' || userRole.includes('company') && userRole.includes('admin'));
          });
          
          console.log('Filtered company admins:', companyAdminUsers);
          setCompanyAdmins(companyAdminUsers);
        } catch (fallbackError) {
          console.error('Fallback approach also failed:', fallbackError);
        }
      } finally {
        setLoadingCompanyAdmins(false);
      }
    };

    if (selectedCompanyId) {
      fetchCompanyAdmins();
    }
  }, [selectedCompanyId]);

  // Add this helper function to check if dates are effectively the same
  const areDatesEffectivelySame = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // Compare only year, month, day, hour, minute to consider them the same
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate() &&
           d1.getHours() === d2.getHours() &&
           d1.getMinutes() === d2.getMinutes();
  };

  // Handle company edit - Fix the navigation path
  const handleEditCompany = (id) => {
    navigate(`/website-admin/edit-company/${id}`);
  };

  // Handle company delete - Show deletion request modal
  const handleDeleteCompany = async (id, name) => {
    // Refresh latest pending approvals to ensure up-to-date check (handles other users' requests)
    await fetchPendingApprovals();

    // Prevent duplicate deletion requests for the same company
    const alreadyPending = pendingApprovals.some(appr => String(appr.company_id) === String(id));
    if (alreadyPending) {
      alert('A deletion request for this company is already pending approval.');
      return;
    }

    setSelectedCompanyForDeletion({ id, name });
    await fetchAvailableApprovers();
    
    // Auto-select the first available approver by default
    setTimeout(() => {
      if (availableApprovers.length > 0) {
        setSelectedApproverId(String(availableApprovers[0].id));
      }
    }, 100);
    
    setShowDeletionRequestModal(true);
  };
  
  // Handle deletion request submission
  const handleDeletionRequestSubmit = async () => {
    if (!selectedCompanyForDeletion || !selectedApproverId) {
      alert('Please select an approver');
      return;
    }
    
    setLoadingDeletionRequest(true);
    
    try {
      const response = await websiteAdminService.createCompanyDeletionRequest(
        selectedCompanyForDeletion.id,
        parseInt(selectedApproverId)
      );
      
      alert('Deletion request submitted successfully. The selected admin will need to approve this request.');
      
      // Close modal and reset state
      setShowDeletionRequestModal(false);
      setSelectedCompanyForDeletion(null);
      setSelectedApproverId('');
      
      // Immediately add the new pending approval to the state
      const newPendingApproval = {
        request_id: response?.data?.request_id || Date.now(), // Use response ID or fallback
        company_id: selectedCompanyForDeletion.id,
        company_name: selectedCompanyForDeletion.name,
        requested_by_name: currentUser?.name || 'Website Admin',
        requested_by_email: currentUser?.email || 'admin@example.com',
        created_at: new Date().toISOString(),
        status: 'PENDING'
      };
      
      // Update pending approvals immediately
      setPendingApprovals(prev => [newPendingApproval, ...prev]);
      
      // Also refresh from server to ensure consistency
      fetchPendingApprovals();
      
    } catch (error) {
      console.error('Failed to submit deletion request:', error);
      alert(error.message || 'Failed to submit deletion request. Please try again.');
    } finally {
      setLoadingDeletionRequest(false);
    }
  };

  // Handle company admin edit
  const handleEditCompanyAdmin = (id) => {
    navigate(`/website-admin/edit-company-admin/${id}`);
  };

  // Handle company admin delete
  const handleDeleteCompanyAdmin = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete admin ${name}? This action cannot be undone.`)) {
      try {
        await apiService.delete(`/users/${id}`);
        setCompanyAdmins(prev => prev.filter(admin => admin.id !== id));
      } catch (error) {
        console.error(`Failed to delete company admin ${id}:`, error);
        alert('Failed to delete company admin. Please try again.');
      }
    }
  };
  
  // Handle website admin edit
  const handleEditWebsiteAdmin = (id) => {
    navigate(`/website-admin/edit-admin/${id}`);
  };
  
  // Handle website admin delete
  const handleDeleteWebsiteAdmin = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete website admin ${name}? This action cannot be undone.`)) {
      try {
        await websiteAdminService.deleteWebsiteAdmin(id);
        // Refresh the admins list
        fetchTotalWebsiteAdmins();
        alert('Website admin deleted successfully');
      } catch (error) {
        console.error(`Failed to delete website admin ${id}:`, error);
        alert('Failed to delete website admin. Please try again.');
      }
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  
  // Fetch pending approval requests
  const fetchPendingApprovals = async () => {
    try {
      const response = await websiteAdminService.getPendingDeletionRequests();
      console.log('Pending approvals:', response);
      setPendingApprovals(Array.isArray(response?.data) ? response.data : response?.data || []);
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      setPendingApprovals([]);
    }
  };
  
  // Fetch available approvers
  const fetchAvailableApprovers = async () => {
    try {
      const response = await websiteAdminService.getAvailableApprovers();
      console.log('Available approvers:', response);
      setAvailableApprovers(Array.isArray(response?.data) ? response.data : response?.data || []);
    } catch (error) {
      console.error('Failed to fetch available approvers:', error);
      setAvailableApprovers([]);
    }
  };

  // Fetch completed deletion requests history
  const fetchCompletedRequests = async () => {
    try {
      setLoadingHistory(true);
      const response = await websiteAdminService.getCompletedDeletionRequests();
      console.log('Completed requests:', response);
      setCompletedRequests(Array.isArray(response?.data) ? response.data : response?.data || []);
    } catch (error) {
      console.error('Failed to fetch completed requests:', error);
      setCompletedRequests([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch all deletion requests history (pending + completed)
  const fetchAllRequestsHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await websiteAdminService.getAllDeletionRequestsHistory();
      console.log('All requests history:', response);
      
      // Separate pending and completed requests
      const allRequests = Array.isArray(response?.data) ? response.data : response?.data || [];
      const pending = allRequests.filter(req => req.status === 'pending' || !req.status);
      const completed = allRequests.filter(req => req.status === 'approved' || req.status === 'rejected');
      
      setPendingApprovals(pending);
      setCompletedRequests(completed);
    } catch (error) {
      console.error('Failed to fetch all requests history:', error);
      setPendingApprovals([]);
      setCompletedRequests([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'completed' && completedRequests.length === 0) {
      fetchCompletedRequests();
    } else if (tab === 'all') {
      fetchAllRequestsHistory();
    } else if (tab === 'pending' && pendingApprovals.length === 0) {
      fetchPendingApprovals();
    }
  };

  // Open history detail modal
  const openHistoryDetailModal = (historyItem) => {
    setSelectedHistoryItem(historyItem);
    setShowHistoryDetailModal(true);
  };
  
  // Handle approval action (approve/reject)
  const handleApprovalAction = async () => {
    if (!selectedApproval) return;
    
    if (approvalAction === 'reject' && !approvalReason.trim()) {
      alert('Rejection reason is mandatory for rejection');
      return;
    }
    
    setLoadingApproval(true);
    
    try {
      const response = await websiteAdminService.processDeletionRequest(
        selectedApproval.request_id,
        approvalAction,
        approvalReason.trim()
      );
      
      if (approvalAction === 'approve') {
        // If approved, the company should be deleted
        setCompanies(prev => prev.filter(company => company.id !== selectedApproval.company_id));
        
        // Update analytics after deletion
        setAnalytics(prev => ({
          ...prev,
          totalCompanies: prev.totalCompanies - 1
        }));
        
        alert(`Company "${selectedApproval.company_name}" has been successfully deleted.`);
      } else {
        alert(`Deletion request for "${selectedApproval.company_name}" has been rejected.`);
      }
      
      // Refresh pending approvals
      fetchPendingApprovals();
      
      // Refresh completed requests if that tab is active or has been viewed
      if (activeTab === 'completed' || completedRequests.length > 0) {
        fetchCompletedRequests();
      }
      
      // Refresh all history if that tab is active
      if (activeTab === 'all') {
        fetchAllRequestsHistory();
      }
      
      // Close modal
      setShowApprovalModal(false);
      setSelectedApproval(null);
      setApprovalAction('');
      setApprovalReason('');
      
    } catch (error) {
      console.error(`Failed to ${approvalAction} deletion request:`, error);
      alert(`Failed to ${approvalAction} deletion request. Please try again.`);
    } finally {
      setLoadingApproval(false);
    }
  };
  
  // Open approval modal
  const openApprovalModal = (approval) => {
    setSelectedApproval(approval);
    setShowApprovalModal(true);
    setApprovalAction('');
    setApprovalReason('');
  };
  
  
  
  // Fetch admin permissions
  const fetchAdminPermissions = async () => {
    try {
      setLoadingPermissions(true);
      console.log('Setting admin permissions from admin list data...');
      
      // Use the canCreateAdmins field from the admin list data directly
      const permissions = {};
      admins.forEach(admin => {
        const adminId = admin.admin_id || admin.id;
        
        // Debug: Check both possible field name formats
        console.log(`=== ADMIN PERMISSION DEBUG for ${admin.email} (ID: ${adminId}) ===`);
        console.log('Full admin object:', JSON.stringify(admin, null, 2));
        console.log('admin.canCreateAdmins:', admin.canCreateAdmins);
        console.log('admin.can_create_admins:', admin.can_create_admins);
        console.log('typeof canCreateAdmins:', typeof admin.canCreateAdmins);
        console.log('typeof can_create_admins:', typeof admin.can_create_admins);
        console.log('================================================');
        
        // Use either field name format that the API might return
        const permission = admin.canCreateAdmins !== undefined 
          ? admin.canCreateAdmins 
          : (admin.can_create_admins !== undefined ? admin.can_create_admins : false);
          
        permissions[adminId] = permission;
        console.log(`Final permission for admin ${admin.email} (ID: ${adminId}): ${permission}`);
      });
      
      console.log('Final permissions object:', permissions);
      setAdminPermissions(permissions);
      
    } catch (error) {
      console.error('Failed to set admin permissions:', error);
      
      // Set permissions based on admin data
      const permissions = {};
      admins.forEach(admin => {
        const adminId = admin.admin_id || admin.id;
        permissions[adminId] = admin.canCreateAdmins || false;
      });
      setAdminPermissions(permissions);
    } finally {
      setLoadingPermissions(false);
    }
  };
  
  // Toggle admin permission
  const toggleAdminPermission = async (adminId, currentPermission) => {
    try {
      console.log(`Attempting to toggle permission for admin ${adminId}: ${currentPermission} -> ${!currentPermission}`);
      const newPermission = !currentPermission;
      
      // Show loading state
      const originalPermission = adminPermissions[adminId];
      setAdminPermissions(prev => ({
        ...prev,
        [adminId]: 'loading'
      }));
      
      const response = await websiteAdminService.updateAdminPermissions(adminId, newPermission);
      console.log('Permission update response:', response);
      
      if (response && response.success) {
        // Check if database verification passed
        if (response.verified === true) {
          // Successfully updated AND verified in database
          setAdminPermissions(prev => ({
            ...prev,
            [adminId]: newPermission
          }));
          
          // Refresh the admin list to get updated data from database
          console.log('✅ Permission updated and verified in database, refreshing admin list...');
          await fetchTotalWebsiteAdmins();
          
          alert(`✅ Permission ${newPermission ? 'granted' : 'revoked'} successfully for admin ${adminId}!\n\nDatabase update confirmed.`);
        } else if (response.verified === false) {
          // API succeeded but database verification failed
          console.error('❌ API succeeded but database was not updated:', response);
          
          // Revert to original state since database wasn't updated
          setAdminPermissions(prev => ({
            ...prev,
            [adminId]: originalPermission
          }));
          
          alert(`❌ Permission update failed!\n\nAPI call succeeded but database was not updated.\nExpected: ${response.expectedValue}\nActual: ${response.actualValue}\n\nPlease check the backend database connection.`);
        } else {
          // API succeeded but couldn't verify
          console.warn('⚠️ API succeeded but could not verify database update');
          
          setAdminPermissions(prev => ({
            ...prev,
            [adminId]: newPermission
          }));
          
          // Still refresh admin list
          await fetchTotalWebsiteAdmins();
          
          alert(`⚠️ Permission ${newPermission ? 'granted' : 'revoked'} for admin ${adminId}.\n\nAPI call succeeded but database verification failed.\nPlease check the permission status manually.`);
        }
      } else {
        // Failed - revert to original state
        setAdminPermissions(prev => ({
          ...prev,
          [adminId]: originalPermission
        }));
        
        const errorMessage = response?.message || response?.details || 'Failed to update permission. Please try again.';
        console.error('Permission update failed:', errorMessage);
        alert(`❌ Failed to update permission: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error in toggleAdminPermission:', error);
      
      // Revert to original state
      setAdminPermissions(prev => ({
        ...prev,
        [adminId]: currentPermission
      }));
      
      const errorMessage = error.message || 'Network error. Please check your connection and try again.';
      alert(`Error updating permission: ${errorMessage}`);
    }
  };
  
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await authService.logout();
      navigate('/auth/login');
    }
  };

  // Add this debug function at the top of your component
  const inspectObject = (obj) => {
    console.log('Complete object:', obj);
    console.log('JSON string:', JSON.stringify(obj));
    console.log('Object keys:', Object.keys(obj));
    return obj;
  };

  useEffect(() => {
    const fetchNewCompanyAdmins = async () => {
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // Fetch all company admins
        const response = await apiService.get('/users?role=company_admin');
        let users = [];
        if (response && response.users) {
          users = response.users;
        } else if (Array.isArray(response)) {
          users = response;
        } else if (response && typeof response === 'object' && Array.isArray(response.data)) {
          users = response.data;
        }
        // Set total admins globally
        setTotalCompanyAdmins(users.length);
        setAnalytics(prev => ({ ...(prev || {}), totalAdmins: users.length }));
        const count = users.filter(user => {
          if (!user.createdAt) return false;
          const created = new Date(user.createdAt);
          return created >= firstDayOfMonth;
        }).length;
        setNewCompanyAdminsThisMonth(count);
        setAnalytics(prev => ({ ...(prev || {}), newCompanyAdminsThisMonth: count }));
      } catch (error) {
        console.error('Failed to fetch new company admins count:', error);
      }
    };
    fetchNewCompanyAdmins();
  }, []);

  // Render a history card (pending / approved / rejected) with detailed info
  const renderHistoryCard = (request, index) => {
    const isPending = request.status === 'pending' || !request.status;
    const isApproved = request.status === 'approved';
    const isRejected = request.status === 'rejected';

    // Dynamic colors based on status
    const bg = isPending ? '#fefcbf' : isApproved ? '#f0fdf4' : '#fef2f2';
    const border = isPending ? '#f59e0b' : isApproved ? '#10b981' : '#ef4444';
    const borderLeft = isPending ? '#d97706' : isApproved ? '#059669' : '#dc2626';

    return (
      <div
        key={`${request.status}-${request.request_id || index}`}
        className="approval-item"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem',
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderLeft: `4px solid ${borderLeft}`,
          borderRadius: '8px',
          marginBottom: '1rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}
      >
        {/* Info section */}
        <div className="approval-info" style={{ flex: 1 }}>
          <div style={{
            fontWeight: '700',
            color: '#111827',
            fontSize: '1.125rem',
            marginBottom: '0.5rem'
          }}>
            🏢 {request.company_name}
          </div>

          <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            👤 <strong>Requested by:</strong> {request.requested_by_name} ({request.requested_by_email})
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            📅 <strong>Requested on:</strong> {new Date(request.created_at).toLocaleString()}
          </div>

          {(!isPending) && (
            <>
              <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                👨‍💼 <strong>Processed by:</strong> {request.approver_name || request.approved_by_name || request.processed_by_name || 'System'}
              </div>
              <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                📅 <strong>Processed on:</strong> {new Date(request.processed_at || request.updated_at).toLocaleString()}
              </div>
            </>
          )}

          {isRejected && request.reason && (
            <div style={{
              color: '#dc2626',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#ffffff',
              borderRadius: '4px',
              border: '1px solid #fecaca'
            }}>
              💬 <strong>Rejection Reason:</strong> {request.reason}
            </div>
          )}

          {isApproved && request.reason && (
            <div style={{
              color: '#065f46',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#ffffff',
              borderRadius: '4px',
              border: '1px solid #d1fae5'
            }}>
              💬 <strong>Approval Notes:</strong> {request.reason}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="approval-actions" style={{ marginLeft: '1rem' }}>
          {isPending ? (
            <button
              onClick={() => openApprovalModal(request)}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                boxShadow: '0 4px 6px rgba(79, 70, 229, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              🔍 Review Request
            </button>
          ) : (
            <button
              onClick={() => openHistoryDetailModal(request)}
              style={{
                padding: '0.5rem 1rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              📄 View Details
            </button>
          )}
        </div>
      </div>
    );
  };

      return (
    <div className="dashboard-layout" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
      <aside className="sidebar" style={{ display: sidebarOpen ? 'block' : 'none', overflowX: 'hidden' }}>
        <div className="brand">
          <span className="brand-logo">🔄</span>
          <span className="brand-name">Sharp RACI</span>
        </div>
        <nav style={{ overflowX: 'hidden', width: '100%' }}>
          <NavLink to="/website-admin/dashboard" className="nav-item">
            <i className="icon">📊</i> Dashboard
          </NavLink>
          
          <div 
            className={`nav-item ${location.pathname.includes('/create-') ? 'active' : ''}`}
            onClick={() => toggleSection('company')}
            style={{ overflowX: 'hidden' }}
          >
            <i className="icon">🏢</i> 
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Company Management</span>
            <i className={`dropdown-icon ${expandedSections.company ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.company ? 'open' : ''}`} style={{ overflowX: 'hidden' }}>
            <NavLink to="/website-admin/create-company" className="nav-item">
              Create Company
            </NavLink>
            <NavLink to="/website-admin/create-company-admin" className="nav-item">
              Create Company Admin
            </NavLink>
          </div>
          
          {/* Only show Register Website Admin if user has permission */}
          {currentUserCanCreate && (
            <NavLink to="/website-admin/create-admin" className="nav-item">
              <i className="icon">👨‍💼</i> Register Website Admin
            </NavLink>
          )}
          
          {/* Company Deletion Records - Only for authorized users */}
          {(currentUserCanCreate || currentUser?.email === 'omvataliya23@gmail.com') && (
            <NavLink to="/website-admin/deletion-records" className="nav-item">
              <i className="icon">📋</i> Company Deletion Records
            </NavLink>
          )}
          
          <button className="nav-item" onClick={handleLogout} style={{ 
            width: '100%', 
            textAlign: 'left', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: '0.5rem',
            height: '44px',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
            overflowX: 'hidden'
          }}>
            <i className="icon">🚪</i> Logout
          </button>
        </nav>
      </aside>

      {/* Collapse toggle button */}
      <button onClick={toggleSidebar} style={{
        position: 'fixed',
        top: '12px',
        left: sidebarOpen ? '312px' : '12px',
        zIndex: 100,
        background: '#4f46e5',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 8px',
        cursor: 'pointer'
      }}>
        {sidebarOpen ? '⮜' : '⮞'}
      </button>
      
      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="dashboard-title">Website Administration</div>
          <div className="header-actions">
            <div className="user-info">
              {loadingUser ? (
                <div>Loading...</div>
              ) : currentUser ? (
                <>
                  <div className="user-avatar">{currentUser.name?.charAt(0) || 'A'}</div>
                  <div className="user-details">
                    <div className="user-name">{currentUser.name || 'Admin'}</div>
                    <div className="user-role">{currentUser.role || 'Website Admin'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="user-avatar">A</div>
                  <div className="user-details">
                    <div className="user-name">Admin</div>
                    <div className="user-role">Website Admin</div>
                  </div>
                </>
              )}
            </div>
            {/* Logout button removed from header as it exists in the sidebar */}
          </div>
        </header>
        
        <div className="content-wrapper">
          <Routes>
            <Route path="/dashboard" element={
              <>
                {/* Dashboard Overview Header - Same as main header for consistency */}
                <div className="dashboard-overview-header" style={{ marginBottom: '1.5rem' }}>
                  <h1>Dashboard Overview</h1>
                </div>
                
                {/* Company Deletion Requests Management - Show only if user is approver for a pending request */}
                {pendingApprovals.some(
                  approval => approval.approver_email && currentUser && approval.approver_email === currentUser.email
                ) && (
                <div className="card" style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    {/* Header with total count */}
                    <div className="section-header" style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: '1.5rem', 
                      alignItems: 'center',
                      borderBottom: '2px solid #f3f4f6',
                      paddingBottom: '1rem'
                    }}>
                      <h2 className="section-title" style={{ 
                        margin: 0, 
                        fontSize: '1.5rem', 
                        fontWeight: '700', 
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        🏢 Company Deletion Requests
                        {pendingApprovals.length > 0 && (
                          <span style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            marginLeft: '0.5rem'
                          }}>
                            {pendingApprovals.length} Pending
                          </span>
                        )}
                      </h2>
                      <button
                        onClick={() => {
                          setShowHistorySection(!showHistorySection);
                          if (!showHistorySection && completedRequests.length === 0) {
                            fetchCompletedRequests();
                          }
                        }}
                        style={{ display: 'none' }}
                      >
                        {showHistorySection ? 'Hide History' : 'Show Full History'}
                      </button>
                    </div>
                    
                    {/* Show basic pending approvals if history section is not expanded */}
                    {!showHistorySection && (
                      <div className="approvals-list">
                        {pendingApprovals.length > 0 ? (
                          pendingApprovals.map((approval, index) => (
                            <div key={approval.request_id || index} className="approval-item" style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '1.25rem',
                              backgroundColor: '#fefcbf',
                              border: '1px solid #f59e0b',
                              borderLeft: '4px solid #d97706',
                              borderRadius: '8px',
                              marginBottom: index < pendingApprovals.length - 1 ? '1rem' : '0',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                              <div className="approval-info" style={{ flex: 1 }}>
                                <div style={{ 
                                  fontWeight: '700', 
                                  color: '#111827',
                                  fontSize: '1.125rem',
                                  marginBottom: '0.5rem'
                                }}>
                                  🏢 {approval.company_name}
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                  👤 <strong>Requested by:</strong> {approval.requested_by_name} ({approval.requested_by_email})
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                  📅 <strong>Requested on:</strong> {new Date(approval.created_at).toLocaleString()}
                                </div>
                                {approval.reason && (
                                  <div style={{ 
                                    color: '#6b7280', 
                                    fontSize: '0.875rem', 
                                    marginTop: '0.5rem',
                                    padding: '0.5rem',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '4px',
                                    border: '1px solid #e5e7eb'
                                  }}>
                                    💬 <strong>Reason:</strong> {approval.reason}
                                  </div>
                                )}
                              </div>
                              <div className="approval-actions" style={{ marginLeft: '1rem' }}>
                                <button
                                  onClick={() => openApprovalModal(approval)}
                                  style={{
                                    padding: '0.75rem 1.25rem',
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.875rem',
                                    boxShadow: '0 4px 6px rgba(79, 70, 229, 0.3)',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                  onMouseOut={(e) => e.target.style.transform = 'translateY(0px)'}
                                >
                                  🔍 Review Request
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '3rem', 
                            color: '#6b7280',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '2px dashed #d1d5db'
                          }}>
                            🎉 No pending deletion requests
                          </div>
                        )}
                      </div>
                    )}

                    {/* Enhanced History Section with Tabs */}
                    {showHistorySection && (
                      <>
                        {/* Tabs for different views */}
                        <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
                          <div className="tabs-nav" style={{
                            display: 'flex',
                            gap: '0.5rem',
                            borderBottom: '1px solid #e5e7eb',
                            marginBottom: '1rem'
                          }}>
                            <button
                              onClick={() => handleTabChange('pending')}
                              style={{
                                padding: '0.75rem 1rem',
                                backgroundColor: activeTab === 'pending' ? '#4f46e5' : 'transparent',
                                color: activeTab === 'pending' ? 'white' : '#6b7280',
                                border: 'none',
                                borderRadius: '6px 6px 0 0',
                                cursor: 'pointer',
                                fontWeight: '500',
                                borderBottom: activeTab === 'pending' ? '2px solid #4f46e5' : '2px solid transparent'
                              }}
                            >
                              📋 Pending ({pendingApprovals.length})
                            </button>
                            <button
                              onClick={() => handleTabChange('completed')}
                              style={{ display: 'none' }}
                            />
                          </div>
                        </div>

                        {/* Tab Content */}
                        {loadingHistory ? (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '3rem', 
                            color: '#6b7280' 
                          }}>
                            <div style={{ 
                              animation: 'spin 2s linear infinite',
                              width: '2rem',
                              height: '2rem',
                              border: '3px solid #f3f3f6',
                              borderTop: '3px solid #4f46e5',
                              borderRadius: '50%',
                              margin: '0 auto 1rem'
                            }}></div>
                            Loading requests...
                          </div>
                        ) : (
                          <>
                            {/* Pending Requests Tab */}
                            {activeTab === 'pending' && (
                              <div className="pending-requests">
                                {pendingApprovals.length === 0 ? (
                                  <div style={{ 
                                    textAlign: 'center', 
                                    padding: '3rem', 
                                    color: '#6b7280',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    border: '2px dashed #d1d5db'
                                  }}>
                                    🎉 No pending deletion requests
                                  </div>
                                ) : (
                                  pendingApprovals.map((approval, index) => (
                                    <div key={approval.request_id || index} className="approval-item" style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '1.25rem',
                                      backgroundColor: '#fefcbf',
                                      border: '1px solid #f59e0b',
                                      borderLeft: '4px solid #d97706',
                                      borderRadius: '8px',
                                      marginBottom: index < pendingApprovals.length - 1 ? '1rem' : '0',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}>
                                      <div className="approval-info" style={{ flex: 1 }}>
                                        <div style={{ 
                                          fontWeight: '700', 
                                          color: '#111827',
                                          fontSize: '1.125rem',
                                          marginBottom: '0.5rem'
                                        }}>
                                          🏢 {approval.company_name}
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                          👤 <strong>Requested by:</strong> {approval.requested_by_name} ({approval.requested_by_email})
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                          📅 <strong>Requested on:</strong> {new Date(approval.created_at).toLocaleString()}
                                        </div>
                                        {approval.reason && (
                                          <div style={{ 
                                            color: '#6b7280', 
                                            fontSize: '0.875rem', 
                                            marginTop: '0.5rem',
                                            padding: '0.5rem',
                                            backgroundColor: '#ffffff',
                                            borderRadius: '4px',
                                            border: '1px solid #e5e7eb'
                                          }}>
                                            💬 <strong>Reason:</strong> {approval.reason}
                                          </div>
                                        )}
                                      </div>
                                      <div className="approval-actions" style={{ marginLeft: '1rem' }}>
                                        <button
                                          onClick={() => openApprovalModal(approval)}
                                          style={{
                                            padding: '0.75rem 1.25rem',
                                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.875rem',
                                            boxShadow: '0 4px 6px rgba(79, 70, 229, 0.3)',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                          onMouseOut={(e) => e.target.style.transform = 'translateY(0px)'}
                                        >
                                          🔍 Review Request
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* Completed Requests Tab */}
                            {activeTab === 'completed' && (
                              <div className="completed-requests">
                                {completedRequests.length === 0 ? (
                                  <div style={{ 
                                    textAlign: 'center', 
                                    padding: '3rem', 
                                    color: '#6b7280',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    border: '2px dashed #d1d5db'
                                  }}>
                                    📜 No completed requests yet
                                  </div>
                                ) : (
                                  completedRequests.map((request, index) => (
                                    <div key={request.request_id || index} className="history-item" style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '1.25rem',
                                                                          backgroundColor: request.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                                    border: `1px solid ${request.status === 'approved' ? '#10b981' : '#ef4444'}`,
                                    borderLeft: `4px solid ${request.status === 'approved' ? '#059669' : '#dc2626'}`,
                                      borderRadius: '8px',
                                      marginBottom: index < completedRequests.length - 1 ? '1rem' : '0',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}>
                                      <div className="request-info" style={{ flex: 1 }}>
                                        <div style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '0.5rem',
                                          marginBottom: '0.5rem'
                                        }}>
                                          <span style={{
                                            padding: '0.25rem 0.75rem',
                                                                                      backgroundColor: request.status === 'approved' ? '#dcfce7' : '#fee2e2',
                                          color: request.status === 'approved' ? '#16a34a' : '#dc2626',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            textTransform: 'uppercase'
                                          }}>
                                            {request.status === 'approved' ? '✅ APPROVED' : '❌ REJECTED'}
                                          </span>
                                          <span style={{ 
                                            fontWeight: '700', 
                                            color: '#111827',
                                            fontSize: '1.125rem'
                                          }}>
                                            🏢 {request.company_name}
                                          </span>
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                          👤 <strong>Requested by:</strong> {request.requested_by_name}
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                          👨‍💼 <strong>Processed by:</strong> {request.approver_name || request.approved_by_name || 'System'}
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                          📅 <strong>Processed on:</strong> {new Date(request.processed_at || request.updated_at).toLocaleString()}
                                        </div>
                                        {request.reason && (
                                          <div style={{ 
                                            color: '#dc2626', 
                                            fontSize: '0.875rem', 
                                            marginTop: '0.5rem',
                                            padding: '0.5rem',
                                            backgroundColor: '#ffffff',
                                            borderRadius: '4px',
                                            border: '1px solid #fecaca'
                                          }}>
                                            💬 <strong>Rejection Reason:</strong> {request.reason}
                                          </div>
                                        )}
                                      </div>
                                      <div className="request-actions" style={{ marginLeft: '1rem' }}>
                                        <button
                                          onClick={() => openHistoryDetailModal(request)}
                                          style={{
                                            padding: '0.5rem 1rem',
                                            background: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            fontSize: '0.875rem'
                                          }}
                                        >
                                          📄 View Details
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* All History Tab */}
                            {activeTab === 'all' && (
                              <div className="all-history">
                                <div style={{ marginBottom: '1rem' }}>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                  }}>
                                    <div style={{
                                      padding: '1rem',
                                      backgroundColor: '#fef3c7',
                                      borderRadius: '8px',
                                      border: '1px solid #f59e0b',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
                                        {pendingApprovals.length}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', color: '#92400e' }}>Pending</div>
                                    </div>
                                    <div style={{
                                      padding: '1rem',
                                      backgroundColor: '#dcfce7',
                                      borderRadius: '8px',
                                      border: '1px solid #10b981',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                                        {completedRequests.filter(r => r.status === 'approved').length}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', color: '#065f46' }}>Approved</div>
                                    </div>
                                    <div style={{
                                      padding: '1rem',
                                      backgroundColor: '#fee2e2',
                                      borderRadius: '8px',
                                      border: '1px solid #ef4444',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                                        {completedRequests.filter(r => r.status === 'rejected').length}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>Rejected</div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Combined list of all requests */}
                                {[...pendingApprovals.map(p => ({ ...p, status: 'pending' })), ...completedRequests]
                                  .sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at))
                                  .map((request, index) => renderHistoryCard(request, index))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Analytics Section */}
                <div className="dashboard-analytics" style={{ 
                  marginBottom: '2rem',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  {loadingAnalytics ? (
                    <div className="loading-spinner">Loading analytics data...</div>
                  ) : analyticsError ? (
                    <div className="alert alert-error">{analyticsError}</div>
                  ) : analytics ? (
                    <div className="widget-grid" style={{
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                      gap: '1.5rem',
                      maxWidth: '1400px',
                      width: '100%'
                    }}>
                      <div className="widget primary">
                        <div className="widget-value">{analytics.totalCompanies || 0}</div>
                        <div className="widget-label">Total Companies</div>
                      </div>
                      <div className="widget secondary">
                        <div className="widget-value">{analytics.totalAdmins || 0}</div>
                        <div className="widget-label">Total Company Admins</div>
                      </div>
                      <div className="widget info" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                      }}>
                        <div className="widget-value" style={{ color: 'white' }}>{totalWebsiteAdmins || analytics.totalWebsiteAdmins || 0}</div>
                        <div className="widget-label" style={{ color: 'white' }}>Total Website Admins</div>
                      </div>
                      <div className="widget success">
                        <div className="widget-value">{analytics.newCompaniesThisMonth || 0}</div>
                        <div className="widget-label">New Companies This Month</div>
                      </div>
                      <div className="widget warning">
                        <div className="widget-value">{newCompanyAdminsThisMonth || 0}</div>
                        <div className="widget-label">New Company Admins This Month</div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-info">No analytics data available</div>
                  )}
                </div>

                {/* Website Admins List - Only show if user has permission or is main admin */}
                {(currentUserCanCreate || currentUser?.email === 'omvataliya23@gmail.com') && (
                  <div className="section card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                      <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                        Website Administrators
                      </h2>
                    {/* Only show Add Website Admin button if user has permission */}
                    {currentUserCanCreate && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/website-admin/create-admin')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        + Add Website Admin
                      </button>
                    )}
                  </div>
                  
                  {loadingAdmins ? (
                    <div className="loading-spinner" style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #667eea', animation: 'spin 1s linear infinite' }}></div>
                      <p style={{ marginTop: '1rem', color: '#667eea' }}>Loading website administrators...</p>
                    </div>
                  ) : admins.length > 0 ? (
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>ID</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Full Name</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Email</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Phone</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Created</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admins.map((admin, index) => (
                            <tr key={admin.admin_id || admin.id || index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500' }}>
                                {admin.admin_id || admin.id}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500' }}>
                                {admin.full_name || admin.fullName || admin.name || "Unknown"}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                {admin.email || "-"}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                {admin.phone || "-"}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                                {admin.created_at || admin.createdAt ? 
                                  new Date(admin.created_at || admin.createdAt).toLocaleString(undefined, { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button 
                                    onClick={() => handleEditWebsiteAdmin(admin.admin_id || admin.id)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Edit Website Admin"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteWebsiteAdmin(admin.admin_id || admin.id, admin.full_name || admin.fullName || admin.name)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#fee2e2',
                                      border: '1px solid #fecaca',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Delete Website Admin"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍💼</div>
                      <h3 style={{ marginBottom: '1rem', fontWeight: '500', color: '#374151' }}>No website administrators found</h3>
                      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                        {currentUserCanCreate ? 'Create your first website administrator to get started' : 'No administrators available to display'}
                      </p>
                      {/* Only show Create button if user has permission */}
                      {currentUserCanCreate && (
                        <button 
                          className="btn" 
                          onClick={() => navigate('/website-admin/create-admin')}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Create Website Admin
                        </button>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Admin Permissions Section - Only for omvataliya23@gmail.com */}
                {currentUser?.email === 'omvataliya23@gmail.com' && (
                  <div className="section card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '2rem', border: '2px solid #fbbf24', backgroundColor: '#fffbeb' }}>
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                      <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#d97706' }}>
                        🔐 Admin Permissions Management
                      </h2>
                      <button
                        onClick={() => {
                          setShowPermissionsSection(!showPermissionsSection);
                          if (!showPermissionsSection && admins.length > 0) {
                            fetchAdminPermissions();
                          }
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: showPermissionsSection ? '#fee2e2' : '#dcfce7',
                          color: showPermissionsSection ? '#b91c1c' : '#15803d',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {showPermissionsSection ? 'Hide Permissions' : 'Manage Permissions'}
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                      <p style={{ margin: 0, color: '#92400e', fontSize: '0.875rem' }}>
                        <strong>⚠️ Special Access:</strong> As the main administrator (omvataliya23@gmail.com), you can control which website admins have permission to create new administrators. By default, new admins cannot create other admins.
                      </p>
                    </div>
                    
                    {showPermissionsSection && (
                      <div>
                        {loadingPermissions ? (
                          <div className="loading-spinner" style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #fbbf24', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ marginTop: '1rem', color: '#d97706' }}>Loading permissions...</p>
                          </div>
                        ) : (
                          <div className="permissions-list">
                            {admins.filter(admin => admin.email !== 'omvataliya23@gmail.com' && admin.email !== currentUser?.email).map((admin, index) => {
                              const adminId = admin.admin_id || admin.id;
                              const hasPermission = adminPermissions[adminId] || false;
                              
                              return (
                                <div key={adminId} className="permission-item" style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '1rem',
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  marginBottom: index < admins.length - 2 ? '0.75rem' : '0'
                                }}>
                                  <div className="admin-info">
                                    <div style={{ fontWeight: '600', color: '#111827' }}>
                                      {admin.full_name || admin.fullName || admin.name}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                      {admin.email}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                      ID: {adminId}
                                    </div>
                                  </div>
                                  <div className="permission-control">
                                    <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
                                      <span style={{ 
                                        fontSize: '0.75rem', 
                                        color: adminPermissions[adminId] === 'loading' ? '#6b7280' : (hasPermission ? '#15803d' : '#b91c1c'),
                                        fontWeight: '500'
                                      }}>
                                        {adminPermissions[adminId] === 'loading' 
                                          ? '⏳ Updating...' 
                                          : (hasPermission ? '✅ Can Create Admins' : '❌ Cannot Create Admins')
                                        }
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => toggleAdminPermission(adminId, hasPermission)}
                                      disabled={adminPermissions[adminId] === 'loading'}
                                      style={{
                                        padding: '0.5rem 1rem',
                                        background: adminPermissions[adminId] === 'loading' 
                                          ? '#f3f4f6' 
                                          : (hasPermission ? '#fee2e2' : '#dcfce7'),
                                        color: adminPermissions[adminId] === 'loading' 
                                          ? '#6b7280' 
                                          : (hasPermission ? '#b91c1c' : '#15803d'),
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: adminPermissions[adminId] === 'loading' ? 'not-allowed' : 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        opacity: adminPermissions[adminId] === 'loading' ? 0.7 : 1
                                      }}
                                    >
                                      {adminPermissions[adminId] === 'loading' 
                                        ? '⏳ Updating...' 
                                        : (hasPermission ? 'Revoke Permission' : 'Grant Permission')
                                      }
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {admins.filter(admin => admin.email !== 'omvataliya23@gmail.com' && admin.email !== currentUser?.email).length === 0 && (
                              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                No other website administrators found to manage permissions for.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Companies List */}
                <div className="section card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                  <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                      Registered Companies
                    </h2>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => navigate('/website-admin/create-company')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      + Add New Company
                    </button>
                  </div>
                  
                  {loadingCompanies ? (
                    <div className="loading-spinner" style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #4f46e5', animation: 'spin 1s linear infinite' }}></div>
                      <p style={{ marginTop: '1rem', color: '#4f46e5' }}>Loading companies...</p>
                    </div>
                  ) : companies.length > 0 ? (
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Company Logo</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Project Logo</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Company Name</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Domain</th>
                            
                            {/* Industry header - existing code */}
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Industry</th>
                            
                            {/* Renamed Size header to No. of Employees */}
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>No. of Employees</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Admins</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Project Name</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>PAN ID</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Created</th>
                            {/* New column for Updated At */}
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Updated</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companies.map((company, index) => {
                            // Inspect the company object to debug
                            inspectObject(company);
                            
                            // Check if a deletion request is already pending for this company
                            const isPendingDeletion = pendingApprovals.some(apr => String(apr.company_id) === String(company.id));
                            
                            return (
                              <tr key={company.id || index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  {company.logoUrl ? (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                                      <img 
                                        src={`${env.apiHost}${company.logoUrl}`} 
                                        alt={`${company.name} logo`} 
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                        // onError={(e) => {
                                        //   e.target.onerror = null; 
                                        //   e.target.src = 'https://via.placeholder.com/40?text=' + company.name.charAt(0);
                                        // }}
                                      />
                                    </div>
                                  ) : (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#4b5563' }}>
                                      {company.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  {company.projectLogo ? (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                                      <img 
                                        src={`${env.apiHost}${company.projectLogo}`} 
                                        alt={`${company.name} project logo`} 
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                      />
                                    </div>
                                  ) : (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#4b5563' }}>
                                      {company.projectName?.charAt(0).toUpperCase() || 'P'}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500' }}>{company.name}</td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{company.domain}</td>
                                
                                {/* Industry cell - improved access with better visibility */}
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  {company.industry || company.Industry || '-'}
                                </td>
                                
                                {/* Size cell - renamed to No. of Employees with improved access */}
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  {company.size || company.Size || '-'}
                                </td>
                                
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  <span style={{ 
                                    backgroundColor: company.adminsCount ? '#dcfce7' : '#fee2e2',
                                    color: company.adminsCount ? '#15803d' : '#b91c1c',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                  }}>
                                    {company.adminsCount || 0}
                                  </span>
                                </td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{company.projectName || '-'}</td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{company.panId || '-'}</td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                                  {company.createdAt ? new Date(company.createdAt).toLocaleString(undefined, { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                                </td>
                                {/* Updated column - show dash if same as created date */}
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                                  {(company.updatedAt && !areDatesEffectivelySame(company.createdAt, company.updatedAt)) ? 
                                    new Date(company.updatedAt).toLocaleString(undefined, { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-'}
                                </td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                      onClick={() => handleEditCompany(company.id)}
                                      style={{
                                        padding: '0.5rem',
                                        background: '#f3f4f6',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                      title="Edit Company"
                                    >
                                      ✏️
                                    </button>
                                    {isPendingDeletion ? (
                                      <button
                                        disabled
                                        style={{
                                          padding: '0.5rem',
                                          background: '#fefcbf',
                                          border: '1px solid #fbbf24',
                                          borderRadius: '4px',
                                          cursor: 'not-allowed'
                                        }}
                                        title="Deletion Pending"
                                      >
                                        ⏳ Pending
                                      </button>
                                    ) : (
                                    <button 
                                      onClick={() => handleDeleteCompany(company.id, company.name)}
                                      style={{
                                        padding: '0.5rem',
                                        background: '#fee2e2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                      title="Delete Company"
                                    >
                                      🗑️
                                    </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
                      <h3 style={{ marginBottom: '1rem', fontWeight: '500', color: '#374151' }}>No companies found</h3>
                      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Create your first company to get started</p>
                      <button 
                        className="btn" 
                        onClick={() => navigate('/website-admin/create-company')}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Create Company
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Company Selection Dropdown - MOVED HERE */}
                <div className="filter-section" style={{ 
                  marginBottom: '1.5rem',
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label htmlFor="companyFilter" style={{ fontWeight: '500' }}>Filter Company Administrators:</label>
                    <select 
                      id="companyFilter" 
                      value={selectedCompanyId} 
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        minWidth: '250px'
                      }}
                    >
                      <option value="">Select a Company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Company Admins List */}
                {selectedCompanyId && (
                  <div className="section card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                      <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                        {`Company Administrators for ${companies.find(c => String(c.id) === String(selectedCompanyId))?.name || 'Selected Company'}`}
                      </h2>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/website-admin/create-company-admin', { state: { preselectedCompanyId: selectedCompanyId } })}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        + Add Company Admin
                      </button>
                    </div>
                    
                    {loadingCompanyAdmins ? (
                      <div className="loading-spinner" style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #4f46e5', animation: 'spin 1s linear infinite' }}></div>
                        <p style={{ marginTop: '1rem', color: '#4f46e5' }}>Loading administrators...</p>
                      </div>
                    ) : companyAdmins.length > 0 ? (
                      <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                              <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Photo</th>
                              <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Full Name</th>
                              <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Email</th>
                              <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Phone</th>
                              <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Designation</th>
                              <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companyAdmins.map((admin, index) => (
                              <tr key={admin.id || index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  {admin.photo ? (
                                    <img src={admin.photo.startsWith('http') ? admin.photo : `${env.apiHost}${admin.photo}`} alt={admin.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#4b5563' }}>
                                      {admin.name?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500' }}>{admin.name || "Unknown"}</td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{admin.email || "-"}</td>
                                {/* Phone cell with improved display and debug info */}
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>
                                      {admin.phone && admin.phone !== '-' ? 
                                        admin.phone : 
                                        (admin.phoneNumber || admin.contactNumber || admin.mobileNumber || "-")}
                                    </span>
                                    {admin.phone === '-' && (
                                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                        No phone provided
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{admin.designation || "Company Administrator"}</td>
                                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                      onClick={() => handleEditCompanyAdmin(admin.id)}
                                      style={{
                                        padding: '0.5rem',
                                        background: '#f3f4f6',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                      title="Edit Admin"
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteCompanyAdmin(admin.id, admin.name)}
                                      style={{
                                        padding: '0.5rem',
                                        background: '#fee2e2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                      title="Delete Admin"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                        <h3 style={{ marginBottom: '1rem', fontWeight: '500', color: '#374151' }}>No administrators found</h3>
                        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>This company doesn't have any administrators yet</p>
                        <button 
                          className="btn" 
                          onClick={() => navigate('/website-admin/create-company-admin', { state: { preselectedCompanyId: selectedCompanyId } })}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Add Administrator
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            } />

            <Route path="/create-company" element={<CreateCompany />} />
            <Route path="/create-company-admin" element={<CreateCompanyAdmin />} />
            <Route path="/create-admin" element={<CreateAdmin />} />
            
            {/* Add the edit routes */}
            <Route path="/edit-company/:id" element={<EditCompany />} />
            <Route path="/edit-company-admin/:id" element={<EditCompanyAdmin />} />
            <Route path="/edit-admin/:id" element={<EditAdmin />} />

            {/* Company Deletion Records route */}
            <Route path="/deletion-records" element={
              <div className="dashboard-page">
                {/* Company Deletion Records Page */}
                <div className="dashboard-overview-header" style={{ marginBottom: '1.5rem' }}>
                  <h1>📋 Company Deletion Records</h1>
                </div>

                {/* Statistics Cards */}
                <div className="widget-grid" style={{
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                  gap: '1.5rem',
                  maxWidth: '1400px',
                  width: '100%',
                  marginBottom: '2rem'
                }}>
                  <div className="widget warning">
                    <div className="widget-value">
                      {pendingApprovals.length}
                    </div>
                    <div className="widget-label">Pending Requests</div>
                  </div>
                  <div className="widget success">
                    <div className="widget-value">
                      {completedRequests.filter(r => r.status === 'approved').length}
                    </div>
                    <div className="widget-label">Approved & Deleted</div>
                  </div>
                  <div className="widget danger" style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white'
                  }}>
                    <div className="widget-value" style={{ color: 'white' }}>
                      {completedRequests.filter(r => r.status === 'rejected').length}
                    </div>
                    <div className="widget-label" style={{ color: 'white' }}>Rejected Requests</div>
                  </div>
                  <div className="widget info" style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <div className="widget-value" style={{ color: 'white' }}>
                      {pendingApprovals.length + completedRequests.length}
                    </div>
                    <div className="widget-label" style={{ color: 'white' }}>Total Requests</div>
                  </div>
                </div>

                {/* All Records Table */}
                <div className="section card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                  <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                      All Deletion Records
                    </h2>
                    <button
                      onClick={() => {
                        setLoadingHistory(true);
                        fetchAllRequestsHistory();
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      🔄 Refresh Data
                    </button>
                  </div>

                  {loadingHistory ? (
                    <div className="loading-spinner" style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #4f46e5', animation: 'spin 1s linear infinite' }}></div>
                      <p style={{ marginTop: '1rem', color: '#4f46e5' }}>Loading deletion records...</p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Request ID</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Company Name</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Status</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Requested By</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Requested On</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Processed By</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Processed On</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...pendingApprovals.map(p => ({ ...p, status: 'pending' })), ...completedRequests]
                            .sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at))
                            .map((record, index) => {
                              const isPending = record.status === 'pending' || !record.status;
                              const isApproved = record.status === 'approved';
                              const isRejected = record.status === 'rejected';
                              
                              return (
                                <tr key={`${record.status}-${record.request_id || index}`} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                  <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontWeight: '500' }}>
                                    #{record.request_id || 'N/A'}
                                  </td>
                                  <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500' }}>
                                    {record.company_name || 'Unknown Company'}
                                  </td>
                                  <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                    <span style={{
                                      padding: '0.25rem 0.75rem',
                                      backgroundColor: isPending ? '#fef3c7' : isApproved ? '#dcfce7' : '#fee2e2',
                                      color: isPending ? '#d97706' : isApproved ? '#16a34a' : '#dc2626',
                                      borderRadius: '12px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      textTransform: 'uppercase'
                                    }}>
                                      {isPending ? '⏳ PENDING' : isApproved ? '✅ APPROVED' : '❌ REJECTED'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                    <div>
                                      <div style={{ fontWeight: '500' }}>{record.requested_by_name || 'Unknown User'}</div>
                                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{record.requested_by_email || 'No email'}</div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                                    {record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'}
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                    {isPending ? (
                                      <span style={{ color: '#6b7280', fontStyle: 'italic' }}>-</span>
                                    ) : (
                                      <div style={{ fontWeight: '500' }}>
                                        {record.approver_name || record.approved_by_name || record.processed_by_name || 'System'}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                                    {isPending ? (
                                      <span style={{ fontStyle: 'italic' }}>-</span>
                                    ) : (
                                      record.processed_at || record.updated_at ? 
                                        new Date(record.processed_at || record.updated_at).toLocaleString() : 
                                        'N/A'
                                    )}
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                    {isPending ? (
                                      <button
                                        onClick={() => openApprovalModal(record)}
                                        style={{
                                          padding: '0.5rem 1rem',
                                          background: '#f3f4f6',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '4px',
                                          cursor: 'pointer'
                                        }}
                                        title="Review Request"
                                      >
                                        🔍
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => openHistoryDetailModal(record)}
                                        style={{
                                          padding: '0.5rem',
                                          background: '#f3f4f6',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '4px',
                                          cursor: 'pointer'
                                        }}
                                        title="View Details"
                                      >
                                        📄
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      
                      {/* Empty state */}
                      {pendingApprovals.length === 0 && completedRequests.length === 0 && (
                        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                          <h3 style={{ marginBottom: '1rem', fontWeight: '500', color: '#374151' }}>No deletion records found</h3>
                          <p style={{ color: '#6b7280' }}>No company deletion requests have been made yet.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            } />
          </Routes>
        </div>
      </main>

      {/* Company Deletion Request Modal */}
      {showDeletionRequestModal && selectedCompanyForDeletion && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-header" style={{
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
                Request Company Deletion
              </h2>
            </div>
            
            <div className="modal-body">
              <div className="company-info" style={{
                backgroundColor: '#fee2e2',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #fecaca'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#b91c1c' }}>
                  ⚠️ Company to Delete: {selectedCompanyForDeletion.name}
                </div>
                <div style={{ color: '#991b1b', fontSize: '0.875rem' }}>
                  This action will permanently delete the company and all associated data.
                </div>
              </div>
              
              <div className="approver-selection" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                  Select Approver (Required):
                </label>
                <select
                  value={selectedApproverId}
                  onChange={(e) => setSelectedApproverId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                  required
                >
                  <option value="">Select an approver...</option>
                  {availableApprovers.map(approver => (
                    <option key={approver.id} value={approver.id}>
                      {approver.name} ({approver.email})
                    </option>
                  ))}
                </select>
              </div>
              

            </div>
            
            <div className="modal-footer" style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  setShowDeletionRequestModal(false);
                  setSelectedCompanyForDeletion(null);
                  setSelectedApproverId('');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                disabled={loadingDeletionRequest}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletionRequestSubmit}
                disabled={!selectedApproverId || loadingDeletionRequest}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!selectedApproverId || loadingDeletionRequest) ? 'not-allowed' : 'pointer',
                  opacity: (!selectedApproverId || loadingDeletionRequest) ? 0.6 : 1
                }}
              >
                {loadingDeletionRequest ? 'Submitting...' : 'Submit Deletion Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {showHistoryDetailModal && selectedHistoryItem && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div className="modal-header" style={{
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#111827',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📋 Company Deletion Request Details
              </h2>
            </div>
            
            <div className="modal-body">
              {/* Status Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <span style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: selectedHistoryItem.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                  color: selectedHistoryItem.status === 'APPROVED' ? '#16a34a' : '#dc2626',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  border: `2px solid ${selectedHistoryItem.status === 'APPROVED' ? '#10b981' : '#ef4444'}`
                }}>
                  {selectedHistoryItem.status === 'APPROVED' ? '✅ APPROVED & DELETED' : '❌ REJECTED'}
                </span>
              </div>

              {/* Company Information */}
              <div className="info-section" style={{
                backgroundColor: '#f9fafb',
                padding: '1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderBottom: '1px solid #d1d5db',
                  paddingBottom: '0.5rem'
                }}>
                  🏢 Company Information
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>Company Name:</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>{selectedHistoryItem.company_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>Request ID:</span>
                    <span style={{ fontWeight: '600', color: '#111827', fontFamily: 'monospace' }}>#{selectedHistoryItem.request_id}</span>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div className="info-section" style={{
                backgroundColor: '#f0f9ff',
                padding: '1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #0284c7'
              }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: '#0c4a6e',
                  borderBottom: '1px solid #0284c7',
                  paddingBottom: '0.5rem'
                }}>
                  📝 Request Details
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500', color: '#0369a1' }}>Requested by:</span>
                    <span style={{ fontWeight: '600', color: '#0c4a6e' }}>
                      {selectedHistoryItem.requested_by_name}
                      <br />
                      <span style={{ fontSize: '0.875rem', fontWeight: '400' }}>
                        ({selectedHistoryItem.requested_by_email})
                      </span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500', color: '#0369a1' }}>Submitted on:</span>
                    <span style={{ fontWeight: '600', color: '#0c4a6e' }}>
                      {new Date(selectedHistoryItem.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedHistoryItem.reason && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ fontWeight: '500', color: '#0369a1', display: 'block', marginBottom: '0.5rem' }}>
                        Initial Request Reason:
                      </span>
                      <div style={{ 
                        padding: '0.75rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '4px',
                        border: '1px solid #bae6fd',
                        fontStyle: 'italic',
                        color: '#0c4a6e'
                      }}>
                        "{selectedHistoryItem.reason}"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Processing Details */}
              <div className="info-section" style={{
                backgroundColor: selectedHistoryItem.status === 'APPROVED' ? '#f0fdf4' : '#fef2f2',
                padding: '1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: `1px solid ${selectedHistoryItem.status === 'APPROVED' ? '#10b981' : '#ef4444'}`
              }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: selectedHistoryItem.status === 'APPROVED' ? '#065f46' : '#991b1b',
                  borderBottom: `1px solid ${selectedHistoryItem.status === 'APPROVED' ? '#10b981' : '#ef4444'}`,
                  paddingBottom: '0.5rem'
                }}>
                  {selectedHistoryItem.status === 'APPROVED' ? '✅ Approval Details' : '❌ Rejection Details'}
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ 
                      fontWeight: '500', 
                      color: selectedHistoryItem.status === 'APPROVED' ? '#059669' : '#dc2626' 
                    }}>
                      Processed by:
                    </span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: selectedHistoryItem.status === 'APPROVED' ? '#065f46' : '#991b1b' 
                    }}>
                      {selectedHistoryItem.approved_by_name || selectedHistoryItem.processed_by_name || 'System'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ 
                      fontWeight: '500', 
                      color: selectedHistoryItem.status === 'APPROVED' ? '#059669' : '#dc2626' 
                    }}>
                      Processed on:
                    </span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: selectedHistoryItem.status === 'APPROVED' ? '#065f46' : '#991b1b' 
                    }}>
                      {new Date(selectedHistoryItem.processed_at || selectedHistoryItem.updated_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedHistoryItem.rejection_reason && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ 
                        fontWeight: '500', 
                        color: '#dc2626', 
                        display: 'block', 
                        marginBottom: '0.5rem' 
                      }}>
                        Rejection Reason:
                      </span>
                      <div style={{ 
                        padding: '0.75rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '4px',
                        border: '1px solid #fecaca',
                        fontWeight: '500',
                        color: '#991b1b'
                      }}>
                        "{selectedHistoryItem.rejection_reason}"
                      </div>
                    </div>
                  )}
                  {selectedHistoryItem.approval_reason && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ 
                        fontWeight: '500', 
                        color: '#059669', 
                        display: 'block', 
                        marginBottom: '0.5rem' 
                      }}>
                        Approval Notes:
                      </span>
                      <div style={{ 
                        padding: '0.75rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '4px',
                        border: '1px solid #d1fae5',
                        fontWeight: '500',
                        color: '#065f46'
                      }}>
                        "{selectedHistoryItem.approval_reason}"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline Summary */}
              <div className="info-section" style={{
                backgroundColor: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: '#475569',
                  borderBottom: '1px solid #cbd5e1',
                  paddingBottom: '0.5rem'
                }}>
                  ⏱️ Processing Timeline
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: '#3b82f6' 
                    }}></div>
                    <span style={{ fontWeight: '500', color: '#334155' }}>
                      Request Submitted: {new Date(selectedHistoryItem.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: selectedHistoryItem.status === 'APPROVED' ? '#f0fdf4' : '#fef2f2',
                    borderRadius: '4px',
                    border: `1px solid ${selectedHistoryItem.status === 'APPROVED' ? '#d1fae5' : '#fecaca'}`
                  }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: selectedHistoryItem.status === 'APPROVED' ? '#10b981' : '#ef4444' 
                    }}></div>
                    <span style={{ 
                      fontWeight: '500', 
                      color: selectedHistoryItem.status === 'APPROVED' ? '#065f46' : '#991b1b' 
                    }}>
                      Request {selectedHistoryItem.status}: {new Date(selectedHistoryItem.processed_at || selectedHistoryItem.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280', 
                    textAlign: 'center',
                    marginTop: '0.5rem'
                  }}>
                    Total processing time: {(() => {
                      const start = new Date(selectedHistoryItem.created_at);
                      const end = new Date(selectedHistoryItem.processed_at || selectedHistoryItem.updated_at);
                      const diffHours = Math.round((end - start) / (1000 * 60 * 60));
                      if (diffHours < 24) return `${diffHours} hours`;
                      return `${Math.round(diffHours / 24)} days`;
                    })()}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer" style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '1.5rem'
            }}>
              <button
                onClick={() => {
                  setShowHistoryDetailModal(false);
                  setSelectedHistoryItem(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedApproval && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-header" style={{
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
                Review Company Deletion Request
              </h2>
            </div>
            
            <div className="modal-body">
                             <div className="company-info" style={{
                 backgroundColor: '#f9fafb',
                 padding: '1rem',
                 borderRadius: '8px',
                 marginBottom: '1.5rem'
               }}>
                 <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                   Company: {selectedApproval.company_name}
                 </div>
                 <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                   Requested by: {selectedApproval.requested_by_name} ({selectedApproval.requested_by_email})
                 </div>
                 <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                   Requested on: {new Date(selectedApproval.created_at).toLocaleString()}
                 </div>
                 {selectedApproval.reason && (
                   <div style={{ marginTop: '0.5rem' }}>
                     <strong>Reason:</strong> {selectedApproval.reason}
                   </div>
                 )}
               </div>
              
              <div className="action-selection" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                  Select Action:
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => setApprovalAction('approve')}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: approvalAction === 'approve' ? '#dcfce7' : '#f3f4f6',
                      color: approvalAction === 'approve' ? '#15803d' : '#374151',
                      border: `2px solid ${approvalAction === 'approve' ? '#15803d' : '#d1d5db'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      flex: 1
                    }}
                  >
                    ✅ Approve Deletion
                  </button>
                  <button
                    onClick={() => setApprovalAction('reject')}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: approvalAction === 'reject' ? '#fee2e2' : '#f3f4f6',
                      color: approvalAction === 'reject' ? '#b91c1c' : '#374151',
                      border: `2px solid ${approvalAction === 'reject' ? '#b91c1c' : '#d1d5db'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      flex: 1
                    }}
                  >
                    ❌ Reject Request
                  </button>
                </div>
              </div>
              
              {approvalAction && (
                                 <div className="reason-input" style={{ marginBottom: '1rem' }}>
                   <label style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                     {approvalAction === 'reject' ? 'Rejection Reason (Required)' : 'Reason (Optional)'}:
                   </label>
                   <textarea
                     value={approvalReason}
                     onChange={(e) => setApprovalReason(e.target.value)}
                     placeholder={approvalAction === 'approve' 
                       ? 'Optional: Add a note about why you approved this deletion...' 
                       : 'Required: Please provide a reason for rejecting this deletion request...'}
                     style={{
                       width: '100%',
                       minHeight: '80px',
                       padding: '0.75rem',
                       border: '1px solid #d1d5db',
                       borderRadius: '6px',
                       fontSize: '0.875rem',
                       resize: 'vertical'
                     }}
                     required={approvalAction === 'reject'}
                   />
                 </div>
              )}
            </div>
            
            <div className="modal-footer" style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedApproval(null);
                  setApprovalAction('');
                  setApprovalReason('');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                disabled={loadingApproval}
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalAction}
                disabled={!approvalAction || loadingApproval || (approvalAction === 'reject' && !approvalReason.trim())}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: approvalAction === 'approve' ? '#15803d' : '#b91c1c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!approvalAction || loadingApproval || (approvalAction === 'reject' && !approvalReason.trim())) ? 'not-allowed' : 'pointer',
                  opacity: (!approvalAction || loadingApproval || (approvalAction === 'reject' && !approvalReason.trim())) ? 0.6 : 1
                }}
              >
                {loadingApproval ? 'Processing...' : `${approvalAction === 'approve' ? 'Approve' : 'Reject'} Request`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add a global style for the spinner animation and fix horizontal scrollbar */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Fix horizontal scrollbar issues */
        .dashboard-layout {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }
        
        .sidebar {
          overflow-x: hidden !important;
          max-width: 300px !important;
        }
        
        .sidebar nav {
          overflow-x: hidden !important;
          width: 100% !important;
        }
        
        .sidebar .nav-item {
          overflow-x: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
        }
        
        .sidebar .sub-nav {
          overflow-x: hidden !important;
          width: 100% !important;
        }
        
        .dashboard-content {
          overflow-x: hidden !important;
          max-width: calc(100vw - 300px) !important;
        }
        
        .content-wrapper {
          overflow-x: hidden !important;
          max-width: 100% !important;
        }
      `}</style>
    </div>
  );
};

export default WebsiteAdminDashboard;
