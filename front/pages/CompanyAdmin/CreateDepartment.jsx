import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

const CreateDepartment = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    hodId: ''
  });
  
  const [users, setUsers] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Add expanded sections state for sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: true, // Auto-expand the departments section
    raci: false
  });
  
  const [companyData, setCompanyData] = useState(null);
  
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

  // Get company data for the header/sidebar
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (userData && userData.company && userData.company.id) {
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
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    
    fetchCompanyData();
  }, []);
  
  // Get current user's company ID and potential department heads
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        
        if (userData && userData.company && userData.company.id) {
          const company = userData.company.id;
          setCompanyId(company);
          
          // Fetch users who could be HOD
          try {
            setLoadingUsers(true);
            // We might want to filter by role, but for simplicity getting all users
            const response = await apiService.get(`/users?companyId=${company}`);
            
            let usersList = [];
            if (response.users) {
              usersList = response.users;
            } else if (Array.isArray(response)) {
              usersList = response;
            }
            
            // Filter to only show users with HOD role
            const hodUsers = usersList.filter(user => user.role === 'hod');
            setUsers(hodUsers);
            
            console.log('Filtered HOD users:', hodUsers.length);
          } catch (error) {
            console.error('Failed to fetch users:', error);
          } finally {
            setLoadingUsers(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    
    fetchUserData();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!companyId) {
      setError('Company information not found. Please try again.');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Department name is required.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Create department payload - only include hodId if one is selected
      const payload = {
        name: formData.name
      };
      
      if (formData.hodId) {
        payload.hodId = parseInt(formData.hodId);
      }
      
      console.log('Creating department with data:', payload);
      
      // Using direct fetch for better error handling
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}/departments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create department');
      }
      
      console.log('Department created:', data);
      setSuccess('Department created successfully!');
      
      // Navigate back to departments list after short delay
      setTimeout(() => {
        navigate('/company-admin/departments', { state: { refreshData: true } });
      }, 1500);
    } catch (error) {
      console.error('Error creating department:', error);
      setError(error.message || 'Failed to create department.');
    } finally {
      setLoading(false);
    }
  };
  
  // Enhance company logo handling
  const renderCompanyLogo = () => {
    if (!companyData) return null;
    
    const rawLogo = companyData.logoUrl || companyData.logo;
    if (rawLogo) {
      const logoUrl = rawLogo.startsWith('http')
        ? rawLogo
        : `${window.location.protocol}//${window.location.hostname}:5000${rawLogo}`;
      
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
    <div className="dashboard-layout">
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
            <NavLink to="/company-admin/department-management" className="nav-item">
              Departments
            </NavLink>
             <NavLink to="/company-admin/department-creation" className="nav-item active">
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
      
      <main className="dashboard-content">
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
        
        <div className="content-wrapper">
          <div className="page-header">
            <h1>Create New Department</h1>
          </div>
          
          {/* Error and success messages */}
          {error && (
            <div className="alert alert-error" style={{ 
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              width: '100%',
              boxSizing: 'border-box'
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
              marginBottom: '1.5rem',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <span>{success}</span>
            </div>
          )}
          
          {/* Department creation form */}
          <div className="card" style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            width: '100%',
            boxSizing: 'border-box',
            display: 'block'
          }}>
            <div className="card-header" style={{ 
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h2>Department Information</h2>
              <p style={{ color: '#6b7280', marginTop: '0.5rem', marginBottom: '0' }}>
                Enter the details for the new department below
              </p>
            </div>
            
            <form onSubmit={handleSubmit} style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '1.5rem',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div className="form-group" style={{ width: '100%', boxSizing: 'border-box', display: 'block' }}>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Department Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
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
              
              <div className="form-group" style={{ width: '100%', boxSizing: 'border-box' }}>
                <label htmlFor="hodId" style={{ display: 'block', marginBottom: '0.5rem' }}>Head of Department (Optional)</label>
                <select
                  id="hodId"
                  name="hodId"
                  value={formData.hodId}
                  onChange={handleChange}
                  disabled={loadingUsers}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">No Head of Department</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
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
                  You can assign a Head of Department later if needed.
                </p>
              </div>
              
              <div className="form-actions" style={{ 
                marginTop: '20px', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '12px',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '1.25rem',
                width: '100%'
              }}>
                <button 
                  type="button" 
                  onClick={() => navigate('/company-admin/department-management')}
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
        </div>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .content-wrapper {
            padding: 1.5rem;
            max-width: 100%;
            box-sizing: border-box;
          }
          
          .dashboard-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
          }
        `}</style>
      </main>
    </div>
  );
};

export default CreateDepartment;

