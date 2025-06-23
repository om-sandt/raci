import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    designation: '',
    phone: '',
    employeeId: '',
    departmentId: '',
    location: '',
    hodId: ''
  });
  const [companyData, setCompanyData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    departments: false,
    raci: false
  });
  const [hods, setHODs] = useState([]);
  const [loadingHODs, setLoadingHODs] = useState(false);

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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('raci_auth_token');
        const response = await fetch(`${env.apiBaseUrl}/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const userData = await response.json();
        console.log('User data loaded:', userData);
        
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || '',
          designation: userData.designation || '',
          phone: userData.phone || '',
          employeeId: userData.employeeId || '',
          departmentId: userData.department?.id || '',
          location: userData.location || '',
          hodId: userData.hod?.id || ''
        });
        
        if (userData.company && userData.company.id) {
          try {
            const deptResponse = await fetch(`${env.apiBaseUrl}/companies/${userData.company.id}/departments`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (deptResponse.ok) {
              const deptData = await deptResponse.json();
              const deptsList = Array.isArray(deptData) ? deptData : (deptData.departments || []);
              setDepartments(deptsList);
            }
          } catch (error) {
            console.error('Failed to fetch departments:', error);
          }
        }

        // Fetch HODs
        if (userData.company && userData.company.id) {
          setLoadingHODs(true);
          try {
            const hodResponse = await fetch(`${env.apiBaseUrl}/companies/${userData.company.id}/hods`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (hodResponse.ok) {
              const hodData = await hodResponse.json();
              setHODs(hodData);
            }
          } catch (error) {
            console.error('Failed to fetch HODs:', error);
          } finally {
            setLoadingHODs(false);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserData();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      setSuccess('User updated successfully!');
      
      setTimeout(() => {
        navigate('/company-admin/user-management', { state: { refreshData: true } });
      }, 1500);
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.message || 'Failed to update user');
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
              objectFit: 'contain'
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
      <div className="content-wrapper">
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #4f46e5', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '1rem', color: '#4f46e5' }}>Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
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
            className={`nav-item active`}
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
            <NavLink to="/company-admin/user-management" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
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
            <h1>Edit User</h1>
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
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: '#f9fafb'
                  }}
                />
                <small style={{ color: '#6b7280' }}>Email cannot be changed</small>
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
              
              <div className="form-group">
                <label htmlFor="departmentId" style={{ display: 'block', marginBottom: '0.5rem' }}>Department</label>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
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
              </div>
              
              <div className="form-group">
                <label htmlFor="designation" style={{ display: 'block', marginBottom: '0.5rem' }}>Designation</label>
                <input
                  type="text"
                  id="designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
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
                <label htmlFor="employeeId" style={{ display: 'block', marginBottom: '0.5rem' }}>Employee ID</label>
                <input
                  type="text"
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
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
                <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Location *</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location || ''}
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
              
              <div className="form-group">
                <label htmlFor="hodId" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Head of Department</label>
                <select
                  id="hodId"
                  name="hodId"
                  value={formData.hodId || ''}
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
                  {hods && hods.map(hod => (
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
                  disabled={saving}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    color: 'white',                    background: saving ? '#94a3b8' : '#4f46e5',                     border: 'none', 
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
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    </div>
  );
};

export default EditUser;
       