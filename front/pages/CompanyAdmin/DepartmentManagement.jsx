import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import env from '../../src/config/env';

const DepartmentManagement = () => {
  const navigate = useNavigate();
  
  // Department form state
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    hodId: ''
  });
  
  // Departments and users state
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [companyData, setCompanyData] = useState(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'create'
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Sidebar state
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: true, // Auto-expand departments section
    raci: false
  });
  
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
  
  // Fetch company data and user info
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        console.log("User data:", userData);
        
        if (userData && userData.company) {
          try {
            // Use direct fetch for my-company endpoint
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/my-company`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
            
            const companyDetails = await response.json();
            console.log('Company details:', companyDetails);
            setCompanyData(companyDetails);
            
            // Now fetch departments for this company
            if (companyDetails && companyDetails.id) {
              fetchDepartments(companyDetails.id);
              fetchUsers(companyDetails.id);
            } else if (userData.company && userData.company.id) {
              fetchDepartments(userData.company.id);
              fetchUsers(userData.company.id);
            }
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            
            // Use company data from user object as fallback
            if (userData.company) {
              setCompanyData({
                id: userData.company.id,
                name: userData.company.name || 'Your Company'
              });
              
              // Try to fetch departments using the company ID from user object
              if (userData.company.id) {
                fetchDepartments(userData.company.id);
                fetchUsers(userData.company.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setLoadingDepts(false);
        setLoadingUsers(false);
      }
    };
    
    fetchCompanyData();
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
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDepartmentForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Submit department form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!departmentForm.name) {
        throw new Error('Department name is required');
      }
      
      if (!companyData || !companyData.id) {
        throw new Error('Company information is missing');
      }
      
      const payload = {
        name: departmentForm.name,
        hodId: departmentForm.hodId ? parseInt(departmentForm.hodId) : undefined,
        companyId: companyData.id
      };
      
      console.log('Creating department with payload:', payload);
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/companies/${companyData.id}/departments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `Failed to create department: ${response.status}`);
      }
      
      console.log('Department created:', responseData);
      setSuccess('Department created successfully!');
      
      // Reset form
      setDepartmentForm({
        name: '',
        hodId: ''
      });
      
      // Refresh departments list
      fetchDepartments(companyData.id);
      
      // Switch back to list view or navigate to list page
      setActiveTab('list');
      // Optional: navigate to the department list
      // navigate("/company-admin/department-management");
    } catch (error) {
      console.error('Error creating department:', error);
      setError(error.message || 'Failed to create department');
    } finally {
      setLoading(false);
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
  
  // Company logo rendering
  const renderCompanyLogo = () => {
    if (!companyData) return null;
    
    if (companyData.logoUrl) {
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
            src={companyData.logoUrl}
            alt={companyData?.name || 'Company'} 
            className="company-logo"
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            onError={(e) => {
              console.log("Logo failed to load, using fallback");
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}</div>`;
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
  
  const handleCreateDepartment = () => {
    navigate('/company-admin/create-department');
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
      <div className="dashboard-layout fix-layout">
        <aside className="sidebar">
         <div className="brand" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px',
          height: '64px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {renderCompanyLogo()}
            <span style={{ 
              fontWeight: '600', 
              fontSize: '16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'white',
              letterSpacing: '0.5px'
            }}>
              {companyData ? companyData.name : 'Company'}
            </span>
          </div>
        </div>
          
          <nav>
            <NavLink to="/company-admin/dashboard" className="nav-item">
              <i className="icon">📊</i> Dashboard
            </NavLink>
            
            <div 
              className={`nav-item`}
              onClick={() => toggleSection('users')}
            >
              <i className="icon">👥</i> 
              <span>User Administration</span>
              <i className={`dropdown-icon ${expandedSections.users ? 'open' : ''}`}>▼</i>
            </div>
            <div className={`sub-nav ${expandedSections.users ? 'open' : ''}`}>
              <NavLink to="/company-admin/user-creation" className="nav-item">
                User Creation
              </NavLink>
              <NavLink to="/company-admin/user-management" className="nav-item">
                User Management
              </NavLink>
            </div>
            
            <div 
              className={`nav-item active`}
              onClick={() => toggleSection('departments')}
            >
              <i className="icon">🏢</i> 
              <span>Department Management</span>
              <i className={`dropdown-icon ${expandedSections.departments ? 'open' : ''}`}>▼</i>
            </div>
            <div className={`sub-nav ${expandedSections.departments ? 'open' : ''}`}>
              <NavLink to="/company-admin/department-management" className={({isActive}) => isActive && activeTab === 'list' ? "nav-item active" : "nav-item"}>
                Department List
              </NavLink>
              <NavLink to="/company-admin/department-creation" className={({isActive}) => isActive || activeTab === 'create' ? "nav-item active" : "nav-item"}>
                Create Department
              </NavLink>
            </div>
            
            <div 
              className={`nav-item`}
              onClick={() => toggleSection('raci')}
            >
              <i className="icon">📅</i> 
              <span>RACI Management</span>
              <i className={`dropdown-icon ${expandedSections.raci ? 'open' : ''}`}>▼</i>
            </div>
            <div className={`sub-nav ${expandedSections.raci ? 'open' : ''}`}>
              <NavLink to="/company-admin/event-master" className="nav-item">
                Event Master
              </NavLink>
              <NavLink to="/company-admin/event-list" className="nav-item">
                Event List
              </NavLink>
              <NavLink to="/company-admin/raci-assignment" className="nav-item">
                RACI Assignment
              </NavLink>
              <NavLink to="/company-admin/raci-tracker" className="nav-item">
                RACI Tracker
              </NavLink>
            </div>
            
            <NavLink to="/company-admin/meeting-calendar" className="nav-item">
              <i className="icon">📆</i> Meeting Calendar
            </NavLink>
            
            <NavLink to="/company-admin/settings" className="nav-item">
              <i className="icon">⚙️</i> Company Settings
            </NavLink>
            
            <button className="nav-item" onClick={handleLogout} style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <i className="icon">🚪</i> Logout
            </button>
          </nav>
        </aside>
        
        <main className="dashboard-content fix-content"
          style={{ marginLeft: '270px', width: 'calc(100% - 270px)' }}>
          <header className="dashboard-header">
            <div className="dashboard-title">
              {companyData ? companyData.name : 'Company'} Administration
            </div>
            <div className="header-actions">
              <div className="user-info">
                <div className="user-avatar">
                  {/* Replace with company logo */}
                  {companyData && companyData.logoUrl ? (
                    <img 
                      src={companyData.logoUrl.startsWith('http') ? 
                        companyData.logoUrl : 
                        `${window.location.protocol}//${window.location.hostname}:5000${companyData.logoUrl}`}
                      alt={companyData?.name || 'Company'} 
                      style={{ 
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        // Replace with first letter of company name inside a colored circle
                        const parent = e.target.parentNode;
                        parent.innerHTML = `<div style="width: 100%; height: 100%; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">${companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}</div>`;
                      }}
                    />
                  ) : (
                    companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'
                  )}
                </div>
                <div className="user-details">
                  <div className="user-name">Administrator</div>
                  <div className="user-role">Company Admin</div>
                </div>
              </div>
            </div>
          </header>
          
          <div className="content-wrapper fix-wrapper">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1>Department Management</h1>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* Tab buttons */}
                <button
                  onClick={() => setActiveTab('list')}
                  className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
                  style={{
                    padding: '0.5rem 1rem',
                    background: activeTab === 'list' ? '#4f46e5' : '#f3f4f6',
                    color: activeTab === 'list' ? 'white' : '#4b5563',
                    border: activeTab === 'list' ? 'none' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Department List
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
                  style={{
                    padding: '0.5rem 1rem',
                    background: activeTab === 'create' ? '#4f46e5' : '#f3f4f6',
                    color: activeTab === 'create' ? 'white' : '#4b5563',
                    border: activeTab === 'create' ? 'none' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Create Department
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
            {activeTab === 'list' && (
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
                        onClick={() => setActiveTab('create')}
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
            )}
            
            {/* Create Department Section */}
            {activeTab === 'create' && (
              <div className="card fix-card">
                <div className="card-header" style={{ 
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <h2>Create New Department</h2>
                  <p style={{ color: '#6b7280', marginTop: '0.5rem', marginBottom: '0' }}>
                    Fill out the form below to create a new department in your company.
                  </p>
                </div>
                
                <form onSubmit={handleSubmit} className="form-grid fix-form">
                  <div className="form-group" style={{ gridColumn: '1 / -1', display: 'block', width: '100%' }}>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Department Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={departmentForm.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter department name"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        display: 'block'
                      }}
                    />
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: '1 / -1', display: 'block', width: '100%' }}>
                    <label htmlFor="hodId" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Head of Department (Optional)</label>
                    <select
                      id="hodId"
                      name="hodId"
                      value={departmentForm.hodId}
                      onChange={handleInputChange}
                      disabled={loadingUsers}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        display: 'block'
                      }}
                    >
                      <option value="">Select Head of Department</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} {user.designation ? `(${user.designation})` : ''}
                        </option>
                      ))}
                    </select>
                    {loadingUsers && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                        Loading users...
                      </div>
                    )}
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      You can assign a department head now or later.
                    </p>
                  </div>
                  
                  <div className="form-actions" style={{
                    marginTop: '20px', 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '12px',
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '1.25rem',
                    gridColumn: '1 / -1',
                    width: '100%'
                  }}>
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('list')}
                      style={{ 
                        padding: '0.75rem 1.25rem', 
                        background: '#f3f4f6', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading}
                      style={{ 
                        padding: '0.75rem 1.5rem', 
                        background: loading ? '#94a3b8' : '#4f46e5', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? 'Creating...' : 'Create Department'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          
          <style jsx global>{`
            .fix-layout {
              display: flex;
              width: 100%;
              height: 100vh;
              overflow: hidden;
            }
            
            .fix-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              overflow-y: auto;
              padding: 0 !important;
            }
            
            .fix-wrapper {
              padding: 1.5rem !important;
              margin: 0 !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
              width: 100% !important;
            }
            
            .fix-card {
              margin: 0 0 1.5rem 0 !important;
              padding: 1.5rem !important;
              width: 100% !important;
              box-sizing: border-box !important;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            }
            
            .fix-form {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1.5rem;
              width: 100% !important;
              box-sizing: border-box !important;
            }
            
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @media (max-width: 768px) {
              .fix-form {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
        </main>
      </div>
    </div>
  );
};

export default DepartmentManagement;

