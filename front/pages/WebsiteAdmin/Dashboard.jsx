import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/dashboard.scss';
import CreateCompany from './CreateCompany';
import CreateCompanyAdmin from './CreateCompanyAdmin';
import EditCompany from './EditCompany';
import EditCompanyAdmin from './EditCompanyAdmin';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import env from '../../src/config/env';

const WebsiteAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({});
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
  
  // Load user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoadingUser(true);
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        console.log('Current user data:', userData);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoadingUser(false);
      }
    };
    
    fetchCurrentUser();
  }, []);

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
      // Clear the state to prevent unnecessary refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);
  
  // Load companies data on component mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Load admins data
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoadingAdmins(true);
        const response = await apiService.get('/website-admins');
        console.log('Admins response:', response);
        setAdmins(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Failed to fetch admins:', error);
      } finally {
        setLoadingAdmins(false);
      }
    };

    fetchAdmins();
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

  // Handle company delete
  const handleDeleteCompany = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        await apiService.delete(`/companies/${id}`);
        setCompanies(prev => prev.filter(company => company.id !== id));
        
        // Update analytics after deletion
        setAnalytics(prev => ({
          ...prev,
          totalCompanies: prev.totalCompanies - 1
        }));
      } catch (error) {
        console.error(`Failed to delete company ${id}:`, error);
        alert('Failed to delete company. Please try again.');
      }
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">🔄</span>
          <span className="brand-name">Sharp RACI</span>
        </div>
        <nav>
          <NavLink to="/website-admin/dashboard" className="nav-item">
            <i className="icon">📊</i> Dashboard
          </NavLink>
          
          <div 
            className={`nav-item ${location.pathname.includes('/create-') ? 'active' : ''}`}
            onClick={() => toggleSection('company')}
          >
            <i className="icon">🏢</i> 
            <span>Company Management</span>
            <i className={`dropdown-icon ${expandedSections.company ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.company ? 'open' : ''}`}>
            <NavLink to="/website-admin/create-company" className="nav-item">
              Create Company
            </NavLink>
            <NavLink to="/website-admin/create-company-admin" className="nav-item">
              Create Company Admin
            </NavLink>
          </div>
          
          <button className="nav-item" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
            <i className="icon">🚪</i> Logout
          </button>
        </nav>
      </aside>
      
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
                      gridTemplateColumns: 'repeat(4, 1fr)', 
                      gap: '1.5rem',
                      maxWidth: '1200px',
                      width: '100%'
                    }}>
                      <div className="widget primary">
                        <div className="widget-value">{analytics.totalCompanies || 0}</div>
                        <div className="widget-label">Total Companies</div>
                      </div>
                      <div className="widget secondary">
                        <div className="widget-value">{analytics.totalAdmins || 0}</div>
                        <div className="widget-label">Total Admins</div>
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
            
            {/* Add the edit company route */}
            <Route path="/edit-company/:id" element={<EditCompany />} />
            <Route path="/edit-company-admin/:id" element={<EditCompanyAdmin />} />
          </Routes>
        </div>
      </main>

      {/* Add a global style for the spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WebsiteAdminDashboard;
