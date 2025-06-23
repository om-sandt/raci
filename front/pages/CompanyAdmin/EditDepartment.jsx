import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

const EditDepartment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    hodId: ''
  });
  
  const [users, setUsers] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add expanded sections state for sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: true, // Auto-expand the departments section
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
  
  // Fetch department and company data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current user's company
        const userData = await authService.getCurrentUser();
        
        if (userData && userData.company && userData.company.id) {
          const company = userData.company.id;
          setCompanyId(company);
          
          // Get company data for the header/sidebar
          try {
            const companyDetails = await apiService.get(`/companies/${company}`);
            setCompanyData(companyDetails);
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            setCompanyData({
              id: company,
              name: userData.company.name || 'Your Company'
            });
          }
          
          // Fetch department data
          try {
            const departmentResponse = await apiService.get(`/departments/${id}`);
            
            if (departmentResponse) {
              setFormData({
                name: departmentResponse.name || '',
                hodId: departmentResponse.hod?.id || ''
              });
            }
          } catch (error) {
            console.error('Failed to fetch department:', error);
            setError('Failed to load department information.');
          }
          
          // Fetch users who could be HOD
          try {
            setLoadingUsers(true);
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
        setError('Failed to load necessary data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Department name is required.');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Create payload - only include hodId if one is selected
      const payload = {
        name: formData.name
      };
      
      if (formData.hodId) {
        payload.hodId = parseInt(formData.hodId);
      }
      
      console.log('Updating department with data:', payload);
      
      // Using direct fetch for better error handling
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update department (${response.status})`);
      }
      
      setSuccess('Department updated successfully!');
      
      // Navigate back to departments list after short delay
      setTimeout(() => {
        navigate('/company-admin/department-management', { state: { refreshData: true } });
      }, 1500);
    } catch (error) {
      console.error('Error updating department:', error);
      setError(error.message || 'Failed to update department.');
    } finally {
      setSaving(false);
    }
  };
  
  const renderCompanyLogo = () => {
    const rawLogo = companyData && (companyData.logoUrl || companyData.logo);
    if (rawLogo) {
      const logoSrc = rawLogo.startsWith('http') ? rawLogo : `${window.location.protocol}//${window.location.hostname}:5000${rawLogo}`;
      return (
        <div style={{ 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: '12px',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '6px',
          padding: '6px',
          margin: '0 10px'
        }}>
          <img 
            src={logoSrc}
            alt={companyData?.name || 'Company'} 
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)'
            }}
          />
        </div>
      );
    } else {
      return (
        <div style={{ 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: '12px',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '6px',
          padding: '6px',
          margin: '0 10px'
        }}>
          <div style={{ 
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: '#4f46e5',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}
          </div>
        </div>
      );
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #4f46e5', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginLeft: '15px' }}>Loading department data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout fix-layout">
      <aside className="sidebar">
        <div className="brand" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '15px 12px',
          height: '64px',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
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
          </div>
        </header>
        
        <div className="content-wrapper fix-wrapper">
          <div className="page-header">
            <h1>Edit Department</h1>
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
          
          {/* Department edit form */}
          <div className="card fix-card">
            <div className="card-header" style={{ 
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h2>Department Information</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="form-grid fix-form">
              <div className="form-group">
                <label htmlFor="name">Department Name *</label>
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
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="hodId">Head of Department (Optional)</label>
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
                    fontSize: '1rem'
                  }}
                >
                  <option value="">No Head of Department</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                {loadingUsers && <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Loading users...</span>}
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
                  disabled={saving}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    background: saving ? '#94a3b8' : '#4f46e5', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
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
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    </div>
  );
};

export default EditDepartment;
         