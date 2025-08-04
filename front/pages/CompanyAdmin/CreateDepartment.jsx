import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import locationService from '../../src/services/location.service';
import divisionService from '../../src/services/division.service';
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

const CreateDepartment = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    hodId: '',
    size: '',
    location: '',
    division: '',
    function: ''
  });
  
  const [users, setUsers] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Add expanded sections state for sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: true, // Auto-expand the departments section
    designations: false,
    locations: false,
    raci: false
  });
  
  const [companyData, setCompanyData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Add locations state
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Add divisions state
  const [divisions, setDivisions] = useState([]);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  
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
        
        if (userData && userData.company && userData.company.id) {
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
              setCompanyData(mappedDetails);
            } else {
              console.warn(`Could not fetch company details, status: ${response.status}`);
              // Still set minimal company data from user object
              setCompanyData({
                id: userData.company.id,
                name: userData.company.name || 'Your Company'
              });
            }
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            // Use fallback data
            setCompanyData({
              id: userData.company.id,
              name: userData.company.name || 'Your Company'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoadingCompany(false);
      }
    };
    
    fetchUserAndCompany();
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
  
  // Fetch locations on mount (like user creation)
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const response = await locationService.getAllLocations();
        if (response && response.data) {
          setLocations(response.data);
        } else if (Array.isArray(response)) {
          setLocations(response);
        } else {
          setLocations([]);
        }
      } catch (error) {
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);
  
  // Fetch divisions on mount
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        setLoadingDivisions(true);
        const response = await divisionService.getDivisions();
        if (response && response.data) {
          setDivisions(response.data);
        } else if (Array.isArray(response)) {
          setDivisions(response);
        } else {
          setDivisions([]);
        }
      } catch (error) {
        setDivisions([]);
      } finally {
        setLoadingDivisions(false);
      }
    };
    fetchDivisions();
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
                Create Department
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
              <div className="form-group" style={{ width: '100%', boxSizing: 'border-box', display: 'block' }}>
                <label htmlFor="size" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Department Size</label>
                <input
                  type="text"
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  placeholder="Enter department size"
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
              <div className="form-group" style={{ width: '100%', boxSizing: 'border-box', display: 'block' }}>
                <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Location</label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={loadingLocations}
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
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc.id || loc._id || loc.name} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
                {loadingLocations && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                    Loading locations...
                  </div>
                )}
                {!loadingLocations && locations.length === 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#b91c1c' }}>
                    No locations found. Please create locations first.
                  </div>
                )}
              </div>
              <div className="form-group" style={{ width: '100%', boxSizing: 'border-box', display: 'block' }}>
                <label htmlFor="division" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Division</label>
                <select
                  id="division"
                  name="division"
                  value={formData.division}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    display: 'block',
                    backgroundColor: 'white'
                  }}
                  disabled={loadingDivisions}
                >
                  <option value="">Select a division</option>
                  {loadingDivisions ? (
                    <option value="" disabled>Loading divisions...</option>
                  ) : divisions.length > 0 ? (
                    divisions.map((division) => (
                      <option key={division.id} value={division.id}>
                        {division.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No divisions available</option>
                  )}
                </select>
                {loadingDivisions && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    Loading divisions...
                  </div>
                )}
                {!loadingDivisions && divisions.length === 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#b91c1c' }}>
                    No divisions found. Please create divisions first.
                  </div>
                )}
              </div>
              <div className="form-group" style={{ width: '100%', boxSizing: 'border-box', display: 'block' }}>
                <label htmlFor="function" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Function</label>
                <input
                  type="text"
                  id="function"
                  name="function"
                  value={formData.function}
                  onChange={handleChange}
                  placeholder="Enter function"
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

export default CreateDepartment;

