import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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

const CreateDesignation = () => {
  const navigate = useNavigate();
  
  // State for designation form
  const [designationForm, setDesignationForm] = useState({
    name: ''
  });
  
  // State for expanded sections in sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: false,
    designations: true, // Auto-expand Designation section
    locations: false,
    raci: false
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // State for loading and messages
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for company data
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  
  // Toggle sidebar sections
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
  
  // Load user and company data
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        
        if (userData && userData.company) {
          setLoadingCompany(true);
          const companyId = userData.company.id;
          
          try {
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}`, {
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
      } finally {
        setLoadingCompany(false);
      }
    };
    
    fetchUserAndCompany();
  }, []);
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDesignationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      if (!designationForm.name.trim()) {
        throw new Error('Designation name is required');
      }
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/designations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: designationForm.name.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to create designation: ${response.status}`;
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          endpoint: `${env.apiBaseUrl}/designations`
        });
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Designation created successfully:', data);
      setSuccess('Designation created successfully!');
      
      // Reset form
      setDesignationForm({
        name: ''
      });
      
    } catch (error) {
      console.error('Error creating designation:', error);
      setError(error.message || 'Failed to create designation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Enhanced logo rendering methods
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
                Create Designation
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
            <h1>Create Designation</h1>
            <p>Add a new designation/position to your company</p>
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
          
          {/* Create Designation Form */}
          <div className="card">
            <div className="card-header" style={{ 
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h2>Designation Details</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Designation Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={designationForm.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Senior Software Engineer, Marketing Manager, Project Lead"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Enter a clear and descriptive designation name that will be used in dropdown selections for user creation.
                </p>
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
                  onClick={() => {
                    setDesignationForm({ name: '' });
                    setError('');
                    setSuccess('');
                  }}
                  style={{ 
                    padding: '0.75rem 1.25rem', 
                    background: '#f3f4f6', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    background: submitting ? '#94a3b8' : '#4f46e5', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Designation'}
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
      `}</style>
    </div>
  );
};

export default CreateDesignation; 