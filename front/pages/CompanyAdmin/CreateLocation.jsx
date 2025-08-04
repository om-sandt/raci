import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
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

const CreateLocation = () => {
  const navigate = useNavigate();
  
  // State for location form
  const [locationForm, setLocationForm] = useState({
    name: ''
  });
  
  // State for loading and messages
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for company data
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/company-admin/dashboard');
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!locationForm.name.trim()) {
      setError('Location name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      await apiService.post('/locations', { name: locationForm.name.trim() });
      setSuccess('Location created successfully!');
      setLocationForm({ name: '' });
      setTimeout(() => {
        navigate('/company-admin/location-management');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to create location');
    } finally {
      setSubmitting(false);
    }
  };

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
              console.log("Logo failed to load, using fallback");
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
      const finalUrl = photoUrl.startsWith('http') ? photoUrl : `${env.apiHost}${photoUrl}`;
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
    <div>
      {/* Top Navbar/Header */}
      <header className="dashboard-header-new" style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="company-info" style={{ display: 'flex', alignItems: 'center' }}>
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
                {companyData ? `${companyData.name} Administration` : 'Administration'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                Create Location
              </p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="user-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1rem', overflow: 'hidden' }}>
              {renderUserPhoto()}
            </div>
            <div className="user-details" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="user-name" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{currentUser ? currentUser.name : 'Loading...'}</div>
              <div className="user-role" style={{ fontSize: '0.8rem', color: '#6b7280' }}>{currentUser ? currentUser.role : 'Loading...'}</div>
            </div>
            <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s ease' }}>Logout</button>
          </div>
        </div>
      </header>
      <div style={{ padding: '2rem', margin: '0 2rem' }}>
        <div className="page-header">
          <h1>Create Location</h1>
          <p>Add a new location to your company</p>
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
        
        {/* Create Location Form */}
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
            <h2>Location Details</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Location Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={locationForm.name}
                onChange={handleInputChange}
                required
                placeholder="Enter location name"
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
                Enter a clear location name that will be used in dropdown selections.
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
                  setLocationForm({ name: '' });
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
                {submitting ? 'Creating...' : 'Create Location'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateLocation; 