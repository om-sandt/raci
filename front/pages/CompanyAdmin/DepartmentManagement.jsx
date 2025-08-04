import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

// Helper to build correct asset URLs (consistent with Dashboard)
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

const DepartmentManagement = () => {
  const navigate = useNavigate();
  

  
  // Departments and users state
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Sidebar state
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: true, // Auto-expand departments section
    designations: false,
    locations: false,
    raci: false,
    divisions: false // Added divisions section
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  
  // Toggle sidebar sections
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
  
  // Load user and company data (consistent with Dashboard)
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        // Get current user
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        console.log("User data:", userData);
        
        if (userData && userData.company) {
          setLoadingCompany(true);
          const companyId = userData.company.id;
          
          try {
            // Use direct fetch to handle errors better
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const companyDetails = await response.json();
              // Map snake_case fields to camelCase for project details compatibility
              const mappedDetails = {
                ...companyDetails,
                projectLogo: companyDetails.projectLogo || companyDetails.project_logo || '',
                projectName: companyDetails.projectName || companyDetails.project_name || ''
              };
              console.log('Company details:', mappedDetails);
              setCompanyData(mappedDetails);
              
              // Now fetch departments for this company
              fetchDepartments(mappedDetails.id);
              fetchUsers(mappedDetails.id);
            } else {
              console.warn(`Could not fetch company details, status: ${response.status}`);
              // Still set minimal company data from user object
              const fallbackData = {
                id: userData.company.id,
                name: userData.company.name || 'Your Company'
              };
              setCompanyData(fallbackData);
              
              // Try to fetch departments using the company ID from user object
              if (userData.company.id) {
                fetchDepartments(userData.company.id);
                fetchUsers(userData.company.id);
              }
            }
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            // Use fallback data
            const fallbackData = {
              id: userData.company.id,
              name: userData.company.name || 'Your Company'
            };
            setCompanyData(fallbackData);
            
            // Try to fetch departments using the company ID from user object
            if (userData.company.id) {
              fetchDepartments(userData.company.id);
              fetchUsers(userData.company.id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setLoadingDepts(false);
        setLoadingUsers(false);
      } finally {
        setLoadingCompany(false);
      }
    };
    
    fetchUserAndCompany();
  }, []);
  
  // Fetch departments
  const fetchDepartments = async (companyId) => {
    try {
      setLoadingDepts(true);
      setError('');
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}/departments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const deptData = await response.json();
      console.log('Departments data:', deptData);
      
      // Handle different response formats
      let departmentsList = [];
      if (Array.isArray(deptData)) {
        departmentsList = deptData;
      } else if (deptData && Array.isArray(deptData.departments)) {
        departmentsList = deptData.departments;
      } else if (deptData && deptData.data && Array.isArray(deptData.data)) {
        departmentsList = deptData.data;
      }
      
      setDepartments(departmentsList);
      console.log('Departments loaded:', departmentsList.length);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setError('Failed to load departments. Please try again.');
    } finally {
      setLoadingDepts(false);
    }
  };
  
  // Fetch users for HOD selection
  const fetchUsers = async (companyId) => {
    try {
      setLoadingUsers(true);
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/users?companyId=${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const userData = await response.json();
      console.log('Users data:', userData);
      
      // Handle different response formats
      let usersList = [];
      if (Array.isArray(userData)) {
        usersList = userData;
      } else if (userData && userData.users) {
        usersList = userData.users;
      }
      
      setUsers(usersList);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };
  

  
  // Delete department
  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }
    
    try {
      setError('');
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/departments/${departmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete department: ${response.status}`);
      }
      
      setSuccess('Department deleted successfully!');
      
      // Refresh departments list
      if (companyData && companyData.id) {
        fetchDepartments(companyData.id);
      }
    } catch (error) {
      console.error('Failed to delete department:', error);
      setError(error.message || 'Failed to delete department');
    }
  };
  
  // Enhanced logo rendering methods (consistent with Dashboard)
  const renderCompanyLogo = () => {
    if (!companyData) return null;
    
    const rawLogo = companyData.logoUrl || companyData.logo;
    if (rawLogo) {
      const logoUrl = rawLogo.startsWith('http')
        ? rawLogo
        : `${env.apiHost}${rawLogo}`;
      
      console.log("Using logo URL:", logoUrl);
      
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
              console.log("Logo failed to load, using fallback");
              // Replace with first letter of company name inside a colored circle
              const parent = e.target.parentNode;
              parent.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}</div>`;
            }}
          />
        </div>
      );
    }
    
    // Fallback to letter display
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

  // Render project logo (used in header)
  const renderProjectLogo = () => {
    if (!companyData) return null;

    if (companyData.projectLogo) {
      const logoUrl = companyData.projectLogo.startsWith('http')
        ? companyData.projectLogo
        : `${env.apiHost}${companyData.projectLogo}`;

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
            alt={companyData?.projectName || 'Project'}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
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

  // Render current user profile photo (used top-right)
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
  

  
  // -----------------------------------------
  // Helper functions for date display
  // -----------------------------------------
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
        hour12: false
      });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid date';
    }
  };

  const shouldShowModifiedDate = (createdAt, updatedAt) => {
    if (!createdAt || !updatedAt) return false;
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    return Math.abs(updated - created) > 1000; // difference >1s
  };
  
  return (
    <div className="container mx-auto px-4 py-8"
      style={{ maxWidth: '100%', width: '100%' }}>
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
                  Department Management
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1>Department Workspace</h1>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => navigate('/company-admin/create-department')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  + Create Department
                </button>
              </div>
            </div>
            
            {/* Error and success messages */}
            {error && (
              <div className="alert alert-error" style={{ 
                padding: '0.75rem 1rem',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '8px',
                marginBottom: '1.5rem' 
              }}>
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="alert alert-success" style={{ 
                padding: '0.75rem 1rem',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                borderRadius: '8px',
                marginBottom: '1.5rem' 
              }}>
                <span>{success}</span>
              </div>
            )}
            
            {/* Department List Section */}
            <div className="card fix-card">
              <div className="card-header" style={{ 
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2>Departments List</h2>
                <div>
                  {/* <button 
                    onClick={() => fetchDepartments(companyData?.id)}
                    style={{
                      padding: '0.5rem',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '0.5rem'
                    }}
                    title="Refresh Departments"
                  >
                    🔄
                  </button> */}
                  {/* <button 
                    onClick={handleCreateDepartment}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Department
                  </button> */}
                </div>
              </div>
                
                {loadingDepts ? (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    padding: '2rem',
                    color: '#6b7280'
                  }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.75rem' }}></div>
                    Loading departments...
                  </div>
                ) : (
                  departments.length > 0 ? (
                    <div className="departments-table-container" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Department Name</th>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Head of Department</th>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Employees</th>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Created On</th>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Modified On</th>
                            <th style={{ textAlign: 'right', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departments.map(dept => (
                            <tr key={dept.id}>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{dept.name}</td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                {dept.hod ? dept.hod.name : 'Not Assigned'}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                {dept.employeesCount || dept.employees?.length || 0}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                {formatDate(dept.createdAt)}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                {shouldShowModifiedDate(dept.createdAt, dept.updatedAt) ? formatDate(dept.updatedAt) : 'Not modified'}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  {/* <button 
                                    onClick={() => navigate(`/company-admin/departments/${dept.id}`)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="View Department Details"
                                  >
                                    👁️
                                  </button> */}
                                  <button 
                                    onClick={() => navigate(`/company-admin/departments/edit/${dept.id}`)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Edit Department"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteDepartment(dept.id)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#fee2e2',
                                      border: '1px solid #fecaca',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      color: '#b91c1c'
                                    }}
                                    title="Delete Department"
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
                    <div style={{ 
                      padding: '2rem', 
                      textAlign: 'center',
                      color: '#6b7280',
                      border: '1px dashed #d1d5db',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏢</div>
                      <p style={{ marginBottom: '1rem' }}>No departments have been created yet.</p>
                      <button
                        onClick={() => navigate('/company-admin/create-department')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Create Your First Department
                      </button>
                    </div>
                  )
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
    </div>
  );
};

export default DepartmentManagement;

