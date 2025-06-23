import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

const CreateUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    designation: '',
    phone: '',
    employeeId: '',
    departmentId: '',
    companyId: '',
    location: '',  // Added location field
    hodId: ''      // Added hodId field
  });
  
  const [tempPassword, setTempPassword] = useState('');
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingHODs, setLoadingHODs] = useState(false);  // Added loading state for HODs
  const [hods, setHODs] = useState([]);  // Added state for HODs
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Add expanded sections state for sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: true, // Auto-expand the users section since we're on a user page
    departments: false,
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

  // Get current user's company and fetch departments
  useEffect(() => {
    const fetchUserAndDepartments = async () => {
      try {
        const userData = await authService.getCurrentUser();
        
        if (userData && userData.company && userData.company.id) {
          // Set company ID in form data
          setFormData(prev => ({
            ...prev,
            companyId: userData.company.id
          }));
          
          // Get company data for the header/sidebar
          try {
            const companyDetails = await apiService.get(`/companies/${userData.company.id}`);
            setCompanyData(companyDetails);
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            setCompanyData({
              id: userData.company.id,
              name: userData.company.name || 'Your Company'
            });
          }
          
          // Fetch departments for the company
          try {
            setLoadingDepts(true);
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/${userData.company.id}/departments`, {
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
            } else if (deptData && deptData.departments) {
              departmentsList = deptData.departments;
            }
            
            setDepartments(departmentsList);
            console.log('Departments loaded:', departmentsList.length);
          } catch (error) {
            console.error('Failed to load departments:', error);
          } finally {
            setLoadingDepts(false);
          }
          
          // Fetch HODs
          try {
            setLoadingHODs(true);
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/users?role=hod&companyId=${userData.company.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
            
            const hodData = await response.json();
            console.log('HODs data:', hodData);
            
            // Handle different response formats
            let hodsList = [];
            if (Array.isArray(hodData)) {
              hodsList = hodData;
            } else if (hodData && hodData.users) {
              hodsList = hodData.users;
            }
            
            setHODs(hodsList);
            console.log('HODs loaded:', hodsList.length);
          } catch (error) {
            console.error('Failed to load HODs:', error);
          } finally {
            setLoadingHODs(false);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    
    fetchUserAndDepartments();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Creating user with data:', formData);
      
      // Convert departmentId and hodId to number if they exist
      const payload = {
        ...formData,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : undefined,
        companyId: parseInt(formData.companyId),
        hodId: formData.hodId ? parseInt(formData.hodId) : undefined,
      };
      
      // Direct fetch for better error handling
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      console.log('User creation response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || `API error: ${response.status}`);
      }
      
      // Always show temporary password if returned
      if (responseData && responseData.tempPassword) {
        setTempPassword(responseData.tempPassword);
        setShowPasswordInfo(true);
        setSuccess('User created successfully!');
      } else {
        setSuccess('User created successfully!');
        
        // If no temp password, redirect to user management page
        setTimeout(() => {
          navigate('/company-admin/user-management', { state: { refreshData: true } });
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };
  
  const content = (
    <div className="content-wrapper fix-wrapper">
      <div className="page-header">
        <h1>Create New User</h1>
      </div>
      
      {/* Temporary Password Display */}
      {showPasswordInfo && (
        <div className="temp-password-info" style={{
          padding: '1.5rem',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '1rem', color: '#0284c7' }}>🔑</span>
            <h2 style={{ margin: 0, fontWeight: '600', color: '#0284c7' }}>
              Temporary Password Created
            </h2>
          </div>
          
          <p style={{ marginBottom: '1rem', color: '#0369a1' }}>
            A temporary password has been generated for this user. Please share it securely with them:
          </p>
          
          <div style={{
            background: 'rgba(2, 132, 199, 0.1)',
            padding: '0.75rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontWeight: '600',
            fontSize: '1.25rem',
            letterSpacing: '0.05em',
            color: '#0369a1',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            {tempPassword}
          </div>
          
          <p style={{ color: '#0369a1', fontWeight: '500' }}>
            Important: The user will be prompted to change this password upon first login.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              onClick={() => navigate('/company-admin/user-management', { state: { refreshData: true } })}
              style={{
                padding: '0.75rem 1.25rem',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Continue to User Management
            </button>
          </div>
        </div>
      )}

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
      
      {success && !showPasswordInfo && (
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
      
      {/* User creation form */}
      <div className="card fix-card">
        <div className="card-header" style={{ 
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h2>User Information</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="form-grid fix-form">
          <div className="form-group">
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter full name"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter email address"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="role" style={{ display: 'block', marginBottom: '0.5rem' }}>Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="user">User</option>
              <option value="company_admin">Company Admin</option>
              <option value="hod">Head of Department</option>
            </select>
          </div>
          
          {/* Department dropdown */}
          <div className="form-group">
            <label htmlFor="departmentId" style={{ display: 'block', marginBottom: '0.5rem' }}>Department *</label>
            <select
              id="departmentId"
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              disabled={loadingDepts}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {loadingDepts && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                Loading departments...
              </div>
            )}
          </div>
          
          {/* Location field - New */}
          <div className="form-group">
            <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem' }}>Location *</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="Enter location (e.g., New York, USA)"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          {/* HOD dropdown - New */}
          <div className="form-group">
            <label htmlFor="hodId" style={{ display: 'block', marginBottom: '0.5rem' }}>Head of Department</label>
            <select
              id="hodId"
              name="hodId"
              value={formData.hodId}
              onChange={handleChange}
              disabled={loadingHODs}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">Select HOD (Optional)</option>
              {hods.map(hod => (
                <option key={hod.id} value={hod.id}>
                  {hod.name}
                </option>
              ))}
            </select>
            {loadingHODs && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                Loading HODs...
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="designation" style={{ display: 'block', marginBottom: '0.5rem' }}>Designation *</label>
            <input
              type="text"
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              required
              placeholder="Enter job title or designation"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number (Optional)"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="employeeId" style={{ display: 'block', marginBottom: '0.5rem' }}>Employee ID *</label>
            <input
              type="text"
              id="employeeId"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
              placeholder="Enter employee ID"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-actions" style={{ 
            marginTop: '20px', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '1.25rem',
            gridColumn: '1 / -1'
          }}>
            <button 
              type="button" 
              onClick={() => navigate('/company-admin/user-management')}
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
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .content-wrapper {
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
      `}</style>
    </div>
  );

  // Enhance company logo handling
  const renderCompanyLogo = () => {
    if (!companyData) return null;
    
    if (companyData.logoUrl) {
      // Make sure the URL is properly formatted
      const logoUrl = companyData.logoUrl.startsWith('http') 
        ? companyData.logoUrl 
        : `${window.location.protocol}//${window.location.hostname}:5000${companyData.logoUrl}`;
      
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

  return (
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
            className={`nav-item active`}
            onClick={() => toggleSection('users')}
          >
            <i className="icon">👥</i> 
            <span>User Administration</span>
            <i className={`dropdown-icon ${expandedSections.users ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.users ? 'open' : ''}`}>
            <NavLink to="/company-admin/user-creation" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
              User Creation
            </NavLink>
            <NavLink to="/company-admin/user-management" className="nav-item">
              User Management
            </NavLink>
          </div>
          
          <div 
            className={`nav-item`}
            onClick={() => toggleSection('departments')}
          >
            <i className="icon">🏢</i> 
            <span>Department Management</span>
            <i className={`dropdown-icon ${expandedSections.departments ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.departments ? 'open' : ''}`}>
            <NavLink to="/company-admin/department-management" className="nav-item">
              Department List
            </NavLink>
            <NavLink to="/company-admin/department-creation" className="nav-item">
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
          
          <NavLink to="/" className="nav-item">
            <i className="icon">🏠</i> Back to Home
          </NavLink>
        </nav>
      </aside>
      
      <main className="dashboard-content fix-content">
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
            <button className="logout-btn" onClick={handleLogout}>
              <span>🚪</span> Logout
            </button>
          </div>
        </header>
        
        <div className="content-wrapper fix-wrapper">
          <div className="page-header">
            <h1>Create New User</h1>
          </div>
          
          {/* Temporary Password Information */}
          {showPasswordInfo && (
            <div className="temp-password-info" style={{
              padding: '1.5rem',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem', marginRight: '1rem', color: '#0284c7' }}>🔑</span>
                <h2 style={{ margin: 0, fontWeight: '600', color: '#0284c7' }}>
                  Temporary Password Created
                </h2>
              </div>
              
              <p style={{ marginBottom: '1rem', color: '#0369a1' }}>
                A temporary password has been generated for this user. Please share it securely with them:
              </p>
              
              <div style={{
                background: 'rgba(2, 132, 199, 0.1)',
                padding: '0.75rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: '600',
                fontSize: '1.25rem',
                letterSpacing: '0.05em',
                color: '#0369a1',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                {tempPassword}
              </div>
              
              <p style={{ color: '#0369a1', fontWeight: '500' }}>
                Important: The user will be prompted to change this password upon first login.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  onClick={() => navigate('/company-admin/user-management', { state: { refreshData: true } })}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Continue to User Management
                </button>
              </div>
            </div>
          )}

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
          
          {success && !showPasswordInfo && (
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
          
          {/* User creation form */}
          <div className="card fix-card">
            <div className="card-header" style={{ 
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h2>User Information</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="form-grid fix-form">
              <div className="form-group">
                <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter full name"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter email address"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="role" style={{ display: 'block', marginBottom: '0.5rem' }}>Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="user">Regular User</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="hod">Head of Department</option>
                </select>
              </div>
              
              {/* Department dropdown */}
              <div className="form-group">
                <label htmlFor="departmentId" style={{ display: 'block', marginBottom: '0.5rem' }}>Department *</label>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  disabled={loadingDepts}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {loadingDepts && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                    Loading departments...
                  </div>
                )}
              </div>
              
              {/* Location field - New */}
              <div className="form-group">
                <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem' }}>Location *</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="Enter location (e.g., New York, USA)"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              {/* HOD dropdown - New */}
              <div className="form-group">
                <label htmlFor="hodId" style={{ display: 'block', marginBottom: '0.5rem' }}>Head of Department</label>
                <select
                  id="hodId"
                  name="hodId"
                  value={formData.hodId}
                  onChange={handleChange}
                  disabled={loadingHODs}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select HOD (Optional)</option>
                  {hods.map(hod => (
                    <option key={hod.id} value={hod.id}>
                      {hod.name}
                    </option>
                  ))}
                </select>
                {loadingHODs && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                    Loading HODs...
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="designation" style={{ display: 'block', marginBottom: '0.5rem' }}>Designation *</label>
                <input
                  type="text"
                  id="designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  required
                  placeholder="Enter job title or designation"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number (Optional)"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="employeeId" style={{ display: 'block', marginBottom: '0.5rem' }}>Employee ID *</label>
                <input
                  type="text"
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                  placeholder="Enter employee ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div className="form-actions" style={{ 
                marginTop: '20px', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '12px',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '1.25rem',
                gridColumn: '1 / -1'
              }}>
                <button 
                  type="button" 
                  onClick={() => navigate('/company-admin/user-management')}
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
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
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
          }
          
          @media (max-width: 768px) {
            .fix-form {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </main>
    </div>
  );
};

export default CreateUser;
