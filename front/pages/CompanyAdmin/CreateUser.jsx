import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
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
  const [hods, setHODs] = useState([]);  // Added state for HODs
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Add expanded sections state for sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: true, // Auto-expand the users section since we're on a user page
    departments: false,
    designations: false,
    locations: false,
    raci: false
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
          
          // Fetch designations and locations (these are global reference data)
          await Promise.all([
            fetchDesignations(userData.company.id),
            fetchLocations(userData.company.id)
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
          
          {/* Location dropdown - Updated to use API data */}
          <div className="form-group">
            <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem' }}>Location *</label>
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
          
          {/* Designation dropdown - Updated to use API data */}
          <div className="form-group">
            <label htmlFor="designation" style={{ display: 'block', marginBottom: '0.5rem' }}>Designation *</label>
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
              parent.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${companyData?.projectName ? companyData.projectName.charAt(0).toUpperCase() : 'P'}</div>`;
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
        {companyData?.projectName ? companyData.projectName.charAt(0).toUpperCase() : 'P'}
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
    <div className="dashboard-layout">
      <aside className="sidebar" style={{ display: sidebarOpen ? 'block' : 'none' }}>
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
              Create User
            </NavLink>
            <NavLink to="/company-admin/user-management" className="nav-item">
              Update User
            </NavLink>
          </div>
          
          <div 
            className={`nav-item`}
            onClick={() => toggleSection('departments')}
          >
            <i className="icon">🏢</i> 
            <span>Department Workspace</span>
            <i className={`dropdown-icon ${expandedSections.departments ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.departments ? 'open' : ''}`}>
            <NavLink to="/company-admin/department-creation" className="nav-item">
              Create Department
            </NavLink>
            <NavLink to="/company-admin/department-management" className="nav-item">
              Department Workspace
            </NavLink>
          </div>

          <div 
            className={`nav-item`}
            onClick={() => toggleSection('designations')}
          >
            <i className="icon">🏷️</i> 
            <span>Designation Directory</span>
            <i className={`dropdown-icon ${expandedSections.designations ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.designations ? 'open' : ''}`}>
            <NavLink to="/company-admin/designation-creation" className="nav-item">
              Create Designation
            </NavLink>
            <NavLink to="/company-admin/designation-management" className="nav-item">
              Update Designation
            </NavLink>
          </div>

          <div 
            className={`nav-item`}
            onClick={() => toggleSection('locations')}
          >
            <i className="icon">📍</i> 
            <span>Location Center</span>
            <i className={`dropdown-icon ${expandedSections.locations ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.locations ? 'open' : ''}`}>
            <NavLink to="/company-admin/location-creation" className="nav-item">
              Create Location
            </NavLink>
            <NavLink to="/company-admin/location-management" className="nav-item">
              Update Location
            </NavLink>
          </div>
          
          <div 
            className={`nav-item`}
            onClick={() => toggleSection('raci')}
          >
            <i className="icon">📅</i> 
            <span>RACI Operations</span>
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
          
          <NavLink to="/company-admin/hierarchy" className="nav-item">
            <i className="icon">🏢</i> Hierarchy
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
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: '0.5rem',
            height: '44px',
            borderRadius: '6px',
            transition: 'background-color 0.2s'
          }}>
            <i className="icon">🚪</i> Logout
          </button>
        </nav>
      </aside>
      
      {/* Collapse toggle button */}
      <button onClick={toggleSidebar} style={{
        position: 'fixed',
        top: '12px',
        left: sidebarOpen ? '312px' : '12px',
        zIndex: 100,
        background: '#4f46e5',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 8px',
        cursor: 'pointer'
      }}>
        {sidebarOpen ? '⮜' : '⮞'}
      </button>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="dashboard-title">
            {companyData ? `${companyData.name} Administration` : 'Administration'}
          </div>
          <div className="header-actions">
            <div className="user-info">
              <div className="user-avatar">
                {renderUserPhoto()}
              </div>
              <div className="user-details">
                <div className="user-name">{currentUser ? currentUser.name : 'Loading...'}</div>
                <div className="user-role">{currentUser ? currentUser.role : 'Loading...'}</div>
              </div>
            </div>
            {/* Logout button removed from header as it exists in the sidebar */}
          </div>
        </header>
        
        <div className="content-wrapper" style={{ paddingRight: '2rem' }}>
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
              
              {/* Location dropdown - Updated to use API data */}
              <div className="form-group">
                <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem' }}>Location *</label>
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
              
              {/* Designation dropdown - Updated to use API data */}
              <div className="form-group">
                <label htmlFor="designation" style={{ display: 'block', marginBottom: '0.5rem' }}>Designation *</label>
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
      </main>
    </div>
  );
};

export default CreateUser;
