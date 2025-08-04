import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

// Helper to build correct asset URLs
const getAssetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  let base;
  if (env.apiBaseUrl && env.apiBaseUrl.startsWith('http')) {
    base = env.apiBaseUrl.replace(/\/?api$/i, '');
  } else {
    base = env.apiBaseUrl || '';
  }
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
};

const UserManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [filters, setFilters] = useState({
    departmentId: '',
    role: '',
    search: ''
  });

  // Sidebar and layout state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    users: true, // Auto-expand users section since we're in user management
    departments: false,
    designations: false,
    locations: false,
    raci: false
  });

  // Sidebar functions
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };

  // Get current user's company ID and load company data for sidebar
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        
        if (userData && userData.company && userData.company.id) {
          setCompanyId(userData.company.id);
          
          // Fetch company details for sidebar
          try {
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/${userData.company.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const companyDetails = await response.json();
              const mappedDetails = {
                ...companyDetails,
                projectLogo: companyDetails.projectLogo || companyDetails.project_logo || '',
                projectName: companyDetails.projectName || companyDetails.project_name || ''
              };
              setCompanyData(mappedDetails);
            } else {
              setCompanyData({
                id: userData.company.id,
                name: userData.company.name || 'Your Company'
              });
            }
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            setCompanyData({
              id: userData.company.id,
              name: userData.company.name || 'Your Company'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    fetchUserData();
  }, []);

  // Load departments for filter
  useEffect(() => {
    if (!companyId) return;

    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('raci_auth_token');
        const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}/departments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setDepartments(Array.isArray(data) ? data : []);
        } else {
          console.warn('Could not load departments for filter');
        }
      } catch (error) {
        console.error('Failed to load departments:', error);
      }
    };

    fetchDepartments();
  }, [companyId]);

  // Enhanced refresh function to reload data after operations
  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string for filters
      let queryParams = `companyId=${companyId}`;
      if (filters.departmentId) queryParams += `&departmentId=${filters.departmentId}`;
      if (filters.role) queryParams += `&role=${filters.role}`;
      if (filters.search) queryParams += `&search=${encodeURIComponent(filters.search)}`;
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Refreshed users data:', data);
      
      // Extract users from response
      let usersList = [];
      if (data && data.users) {
        usersList = data.users;
      } else if (Array.isArray(data)) {
        usersList = data;
      }
      
      // Process each user to ensure data is formatted correctly
      const processedUsers = usersList.map(user => ({
        ...user,
        location: user.location || 'Not specified',
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null
      }));
      
      setUsers(processedUsers);
    } catch (error) {
      console.error('Error refreshing users:', error);
      setError('Failed to refresh users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load users with filters
  useEffect(() => {
    if (!companyId) return;
    refreshData();
    
    // Check if we need to refresh data when returning from create/edit
    if (location.state?.refreshData) {
      refreshData();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [companyId, filters, location.state?.refreshData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value
    }));
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      try {
        await apiService.delete(`/users/${userId}`);
        // Remove user from list and refresh data to ensure accuracy
        refreshData();
      } catch (error) {
        console.error(`Failed to delete user ${userId}:`, error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  // Enhanced format date function helper
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false // Use 24-hour format
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };
  
  // Function to compare dates and determine if we should show modified date
  const shouldShowModifiedDate = (createdAt, updatedAt) => {
    if (!createdAt || !updatedAt) return false;
    
    // Parse dates and compare them
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    
    // If dates are within 1 second of each other, consider them the same
    // (to handle slight server timestamp differences)
    return Math.abs(updated - created) > 1000;
  };

  // -----------------------------
  //  Local search filtering
  // -----------------------------
  const displayedUsers = users.filter(user => {
    // If no search term, include all users
    if (!filters.search) return true;

    const searchTerm = filters.search.toLowerCase();

    // Build a concatenated string of all searchable fields
    const searchableContent = [
      user.name,
      user.email,
      // Normalize role names for better readability (e.g., company_admin -> admin)
      user.role === 'company_admin' ? 'admin' : user.role,
      user.department?.name,
      user.designation,
      user.location,
      user.id // allow searching by user ID
    ]
      .filter(Boolean) // remove undefined/null
      .join(' ') // join into single string
      .toLowerCase();

    return searchableContent.includes(searchTerm);
  });

  // Logo and photo rendering functions
  const renderCompanyLogo = () => {
    if (!companyData) return null;
    
    const rawLogo = companyData.logoUrl || companyData.logo;
    if (rawLogo) {
      const logoUrl = rawLogo.startsWith('http')
        ? rawLogo
        : `${env.apiHost}${rawLogo}`;
      
      return (
        <div style={{ 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: '10px',
          flexShrink: 0,
          border: '1px solid #f3f4f6',
          borderRadius: '4px',
          overflow: 'hidden',
          background: '#fff'
        }}>
          <img 
            src={logoUrl}
            alt={companyData?.name || 'Company'} 
            className="company-logo"
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            onError={(e) => {
              const parent = e.target.parentNode;
              parent.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}</div>`;
            }}
          />
        </div>
      );
    }
    
    return (
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '50%', 
        backgroundColor: '#4f46e5', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontWeight: 'bold', 
        fontSize: '18px',
        marginRight: '10px',
        flexShrink: 0
      }}>
        {companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}
      </div>
    );
  };

  const renderUserPhoto = () => {
    if (!currentUser) return null;
    const photoUrl = currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto;
    if (photoUrl) {
      const finalUrl = getAssetUrl(photoUrl);
      return (
        <img
          src={finalUrl}
          alt={currentUser?.name || 'User'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={(e) => {
            const parent = e.target.parentNode;
            parent.innerHTML = `<div style=\"width: 100%; height: 100%; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;\">${currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</div>`;
          }}
        />
      );
    }
    return currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="dashboard-layout-new">
      <header className="dashboard-header-new">
        <div className="header-left">
          <div className="company-info">
            <button 
              onClick={() => navigate('/company-admin/dashboard')}
              className="back-button"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                marginRight: '1rem',
                marginLeft: '-0.5rem',
                marginTop: '2px',
                marginBottom: '2px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '38px',
                width: '38px'
              }}
              onMouseEnter={e => e.target.style.background = '#f3f4f6'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              ←
            </button>
            {renderCompanyLogo()}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                {companyData ? companyData.name : 'Company'} Administration
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                User Management
              </p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              {renderUserPhoto()}
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser ? currentUser.name : 'Loading...'}</div>
              <div className="user-role">{currentUser ? currentUser.role : 'Loading...'}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="logout-button"
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#dc2626'}
            onMouseLeave={(e) => e.target.style.background = '#ef4444'}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content-new">
        <div style={{ padding: '2rem', margin: '0 2rem' }}>
          <div className="page-header">
            <h1>User Management</h1>
          </div>

      {/* Filters */}
      <div className="filters-card" style={{ 
        padding: '1.5rem', 
        background: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label htmlFor="department-filter" style={{ display: 'block', marginBottom: '0.5rem' }}>Department</label>
            <select 
              id="department-filter" 
              name="departmentId" 
              value={filters.departmentId}
              onChange={handleFilterChange}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label htmlFor="role-filter" style={{ display: 'block', marginBottom: '0.5rem' }}>Role</label>
            <select 
              id="role-filter" 
              name="role" 
              value={filters.role}
              onChange={handleFilterChange}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="company_admin">Company Admins</option>
              <option value="hod">Department Heads</option>
            </select>
          </div>
          
          <div style={{ flex: '2', minWidth: '300px' }}>
            <label htmlFor="search-filter" style={{ display: 'block', marginBottom: '0.5rem' }}>Search</label>
            <input 
              id="search-filter" 
              type="text" 
              name="search"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search by name, email, role, department, designation, location, or ID"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="section card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title">Users List</h2>
        </div>
        
        {loading ? (
          <div className="loading-spinner" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #4f46e5', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '1rem', color: '#4f46e5' }}>Loading users...</p>
          </div>
        ) : error ? (
          <div className="error-message" style={{ 
            padding: '1rem', 
            backgroundColor: '#fee2e2', 
            color: '#b91c1c',
            borderRadius: '6px',
            textAlign: 'center' 
          }}>
            {error}
          </div>
        ) : displayedUsers.length > 0 ? (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Name</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Email</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Role</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Department</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Designation</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Location</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Created At</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Modified At</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '500', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((user, index) => (
                  <tr key={user.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{user.name}</td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{user.email}</td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: 
                          user.role === 'company_admin' ? '#dbeafe' : 
                          user.role === 'hod' ? '#fef3c7' : '#dcfce7',
                        color: 
                          user.role === 'company_admin' ? '#1e40af' : 
                          user.role === 'hod' ? '#b45309' : '#15803d'
                      }}>
                        {user.role === 'company_admin' ? 'Admin' : 
                         user.role === 'hod' ? 'Department Head' : 'User'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                      {user.department ? user.department.name : '-'}
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                      {user.designation || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                      {user.location || 'Not specified'}
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td>
                      {shouldShowModifiedDate(user.createdAt, user.updatedAt) 
                        ? formatDate(user.updatedAt) 
                        : "-"}
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => navigate(`/company-admin/users/edit/${user.id}`)}
                          style={{
                            padding: '0.5rem',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="Edit User"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          style={{
                            padding: '0.5rem',
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="Delete User"
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
            <h3 style={{ marginBottom: '1rem', fontWeight: '500', color: '#374151' }}>No users found</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              {filters.departmentId || filters.role || filters.search ? 
                'No users match your current filters.' : 
                'Create your first user to get started'}
            </p>
            <button 
              className="btn" 
              onClick={() => navigate('/company-admin/user-creation')}
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
              Add User
            </button>
          </div>
        )}
      </div>
        </div>
      </main>

      <style jsx="true">{`
        .dashboard-layout-new {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          display: flex;
          flex-direction: column;
        }
        
        .dashboard-header-new {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .header-left {
          display: flex;
          align-items: center;
        }
        
        .company-info {
          display: flex;
          align-items: center;
        }
        
        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e0e7ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1rem;
          overflow: hidden;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: #111827;
        }
        
        .user-role {
          font-size: 0.8rem;
          color: #6b7280;
        }
        
        .dashboard-content-new {
          flex: 1;
          overflow-y: auto;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
