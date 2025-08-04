import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
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

// Move HelpModal to the very top of the file
const HelpModal = ({ onClose, title, text }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}
    onClick={onClose}
  >
    <div style={{
      background: 'white',
      borderRadius: '10px',
      padding: '2rem',
      maxWidth: '420px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
      position: 'relative',
      cursor: 'auto'
    }}
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '14px',
          background: 'none',
          border: 'none',
          fontSize: '1.3em',
          cursor: 'pointer',
          color: '#888'
        }}
        aria-label="Close"
      >×</button>
      <h3 style={{ marginBottom: '1rem', color: '#4f46e5' }}>{title}</h3>
      <div style={{ fontSize: '1.05em', color: '#222', lineHeight: '1.7' }}>{text}</div>
    </div>
  </div>
);

const CreateUser = () => {
  const navigate = useNavigate();
  // Add showHelp state at the top
  const [showNameHelp, setShowNameHelp] = useState(false);
  const [showEmailHelp, setShowEmailHelp] = useState(false);
  const [showRoleHelp, setShowRoleHelp] = useState(false);
  const [showDepartmentHelp, setShowDepartmentHelp] = useState(false);
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [showHodHelp, setShowHodHelp] = useState(false);
  const [showDesignationHelp, setShowDesignationHelp] = useState(false);
  const [showEmployeeIdHelp, setShowEmployeeIdHelp] = useState(false);
  const [showDivisionHelp, setShowDivisionHelp] = useState(false);
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
    hodId: '',     // Added hodId field
    division: '', // Added division field
    dob: '', // Added Date of Birth
    doj: '' // Added Date of Joining
  });
  
  const [tempPassword, setTempPassword] = useState('');
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);  // Added designations state
  const [locations, setLocations] = useState([]);        // Added locations state
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingDesignations, setLoadingDesignations] = useState(false);  // Added loading state
  const [loadingLocations, setLoadingLocations] = useState(false);        // Added loading state
  const [loadingHODs, setLoadingHODs] = useState(false);  // Added loading state for HODs
  const [loadingDivisions, setLoadingDivisions] = useState(false);  // Added loading state for divisions
  const [hods, setHODs] = useState([]);  // Added state for HODs
  const [divisions, setDivisions] = useState([]);  // Added state for divisions
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/company-admin/dashboard');
  };

  // Fetch designations 
  const fetchDesignations = async (companyId) => {
    try {
      setLoadingDesignations(true);
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/designations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error fetching designations:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          endpoint: `${env.apiBaseUrl}/designations`
        });
        throw new Error(`Failed to fetch designations: ${response.status}`);
      }
      
      const data = await response.json();
      setDesignations(data.data || data || []);
      console.log('Designations loaded successfully:', data);
    } catch (error) {
      console.error('Error fetching designations:', error);
      // Use empty array as fallback
      setDesignations([]);
    } finally {
      setLoadingDesignations(false);
    }
  };

  // Fetch locations
  const fetchLocations = async (companyId) => {
    try {
      setLoadingLocations(true);
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error fetching locations:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          endpoint: `${env.apiBaseUrl}/locations`
        });
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }
      
      const data = await response.json();
      setLocations(data.data || data || []);
      console.log('Locations loaded successfully:', data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Use empty array as fallback
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };
  
  // Fetch divisions
  const fetchDivisions = async () => {
    try {
      setLoadingDivisions(true);
      const res = await divisionService.getDivisions();
      setDivisions(res.data || []);
      console.log('Divisions loaded successfully:', res);
    } catch (error) {
      console.error('Error fetching divisions:', error);
      setDivisions([]);
    } finally {
      setLoadingDivisions(false);
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
          // Set company ID in form data
          setFormData(prev => ({
            ...prev,
            companyId: userData.company.id
          }));
          
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
          
          // Fetch designations, locations and divisions
          await Promise.all([
            fetchDesignations(userData.company.id),
            fetchLocations(userData.company.id),
            fetchDivisions()
          ]);
        }
        
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoadingCompany(false);
      }
    };
    
    fetchUserAndCompany();
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
      
      // Use FormData for multipart/form-data as per API spec
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('role', formData.role);
      if (formData.designation) formDataToSend.append('designation', formData.designation);
      if (formData.division) formDataToSend.append('division', formData.division);
      if (formData.phone) formDataToSend.append('phone', formData.phone);
      if (formData.employeeId) formDataToSend.append('employeeId', formData.employeeId);
      if (formData.departmentId) formDataToSend.append('departmentId', formData.departmentId);
      if (formData.companyId) formDataToSend.append('companyId', formData.companyId);
      if (formData.location) formDataToSend.append('location', formData.location);
      if (formData.hodId) formDataToSend.append('hodId', formData.hodId);
      if (formData.dob) formDataToSend.append('dob', formData.dob);
      if (formData.doj) formDataToSend.append('doj', formData.doj);
      // If you have a photo upload, add it here: if (photo) formDataToSend.append('photo', photo);

      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
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
              parent.innerHTML = '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">' + (companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C') + '</div>';
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
              parent.innerHTML = '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">' + (companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C') + '</div>';
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
            parent.innerHTML = '<div style="width: 100%; height: 100%; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">' + (currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U') + '</div>';
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
              onClick={handleBackToDashboard}
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
                Create User
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
          <div className="card" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <div className="card-header" style={{ 
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h2>User Information</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label htmlFor="name" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Full Name *
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowNameHelp(true)} title="Help on Full Name">ℹ️</span>
                </label>
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
                <label htmlFor="email" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Email *
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowEmailHelp(true)} title="Help on Email">ℹ️</span>
                </label>
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
                <label htmlFor="role" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Role *
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowRoleHelp(true)} title="Help on Role">ℹ️</span>
                </label>
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
                <label htmlFor="departmentId" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Department *
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowDepartmentHelp(true)} title="Help on Department">ℹ️</span>
                </label>
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
              
              {/* Location dropdown - Updated to use API data */}
              <div className="form-group">
                <label htmlFor="location" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Location *
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowLocationHelp(true)} title="Help on Location">ℹ️</span>
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={loadingLocations}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select Location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.name}>
                      {location.name}
                    </option>
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
              
              {/* HOD dropdown - New */}
              <div className="form-group">
                <label htmlFor="hodId" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Head of Department
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowHodHelp(true)} title="Help on HOD">ℹ️</span>
                </label>
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
              
              {/* Designation dropdown - Updated to use API data */}
              <div className="form-group">
                <label htmlFor="designation" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Designation *
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowDesignationHelp(true)} title="Help on Designation">ℹ️</span>
                </label>
                <select
                  id="designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  disabled={loadingDesignations}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select Designation</option>
                  {designations.map(designation => (
                    <option key={designation.id} value={designation.name}>
                      {designation.name}
                    </option>
                  ))}
                </select>
                {loadingDesignations && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                    Loading designations...
                  </div>
                )}
                {!loadingDesignations && designations.length === 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#b91c1c' }}>
                    No designations found. Please create designations first.
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem' }}>WhatsApp No</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter WhatsApp number (Optional)"
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
                <label htmlFor="dob" style={{ display: 'block', marginBottom: '0.5rem' }}>Date of Birth</label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob || ''}
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
                <label htmlFor="doj" style={{ display: 'block', marginBottom: '0.5rem' }}>Date of Joining</label>
                <input
                  type="date"
                  id="doj"
                  name="doj"
                  value={formData.doj || ''}
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
                <label htmlFor="employeeId" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Employee ID *
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowEmployeeIdHelp(true)} title="Help on Employee ID">ℹ️</span>
                </label>
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
              <div className="form-group">
                <label htmlFor="division" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                  Division
                  <span style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }} onClick={() => setShowDivisionHelp(true)} title="Help on Division">ℹ️</span>
                </label>
                <select
                  id="division"
                  name="division"
                  value={formData.division}
                  onChange={handleChange}
                  disabled={loadingDivisions}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select Division</option>
                  {divisions.map(division => (
                    <option key={division.id} value={division.name}>
                      {division.name}
                    </option>
                  ))}
                </select>
                {loadingDivisions && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                    Loading divisions...
                  </div>
                )}
                {!loadingDivisions && divisions.length === 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#b91c1c' }}>
                    No divisions found. Please create divisions first.
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
      </main>

      {showNameHelp && (
        <HelpModal onClose={() => setShowNameHelp(false)} title="Full Name" text="Use your full name as per the Company's Employee Master" />
      )}
      {showEmailHelp && (
        <HelpModal onClose={() => setShowEmailHelp(false)} title="Email" text="Use your company-assigned email ID" />
      )}
      {showRoleHelp && (
        <HelpModal onClose={() => setShowRoleHelp(false)} title="Role" text="Select your role as per assigned access rights" />
      )}
      {showDepartmentHelp && (
        <HelpModal onClose={() => setShowDepartmentHelp(false)} title="Department" text="Select your department as per company records." />
      )}
      {showLocationHelp && (
        <HelpModal onClose={() => setShowLocationHelp(false)} title="Location" text="Specify your official seating location as per company records" />
      )}
      {showHodHelp && (
        <HelpModal onClose={() => setShowHodHelp(false)} title="HOD" text="Enter the name of your Head of Department as per company records" />
      )}
      {showDesignationHelp && (
        <HelpModal onClose={() => setShowDesignationHelp(false)} title="Designation" text="Enter your official designation as per company records." />
      )}
      {showEmployeeIdHelp && (
        <HelpModal onClose={() => setShowEmployeeIdHelp(false)} title="Employee ID" text="Enter your Employee ID as per official records." />
      )}
      {showDivisionHelp && (
        <HelpModal onClose={() => setShowDivisionHelp(false)} title="Division" text="Select your division as per company structure" />
      )}

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
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-actions {
          grid-column: 1 / -1;
        }
      `}</style>
    </div>
  );
};

export default CreateUser;
