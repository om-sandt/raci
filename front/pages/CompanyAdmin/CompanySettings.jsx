import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import authService from '../../src/services/auth.service';
import env from '../../src/config/env';
import '../../styles/dashboard.scss';

const CompanySettings = () => {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // State for expanded sections in sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: false,
    designations: false,
    locations: false,
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

  // Helper to build correct asset URLs (supports absolute or relative backend paths)
  const getAssetUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    let base;
    if (env.apiBaseUrl.startsWith('http')) {
      base = env.apiBaseUrl.replace(/\/?api$/i, '');
    } else {
      base = env.apiBaseUrl; // keep relative '/api'
    }
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
  };

  // Load user and company data (consistent with other pages)
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        // Get current user
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        console.log("User data:", userData);
        
        if (userData && userData.company) {
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
              console.log('Company details:', mappedDetails);
              setCompanyData(mappedDetails);
              setCompanyInfo(mappedDetails);
            } else {
              console.warn(`Could not fetch company details, status: ${response.status}`);
              // Still set minimal company data from user object
              const fallbackData = {
                id: userData.company.id,
                name: userData.company.name || 'Your Company'
              };
              setCompanyData(fallbackData);
              setCompanyInfo(fallbackData);
            }
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            // Use fallback data
            const fallbackData = {
              id: userData.company.id,
              name: userData.company.name || 'Your Company'
            };
            setCompanyData(fallbackData);
            setCompanyInfo(fallbackData);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
        setLoadingCompany(false);
      }
    };
    
    fetchUserAndCompany();
  }, []);

  // Enhanced logo rendering methods (consistent with other pages)
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8" style={{ margin: 0, padding: 0, maxWidth: '100%', width: '100%' }}>
        <div className="dashboard-layout fix-layout">
          <main className="dashboard-content fix-content">
            <div className="content-wrapper fix-wrapper">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '4rem',
                color: '#6b7280'
              }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  border: '3px solid #e5e7eb', 
                  borderTopColor: '#6366f1', 
                  animation: 'spin 1s linear infinite', 
                  marginRight: '1rem' 
                }}></div>
                <p style={{ fontWeight: '500' }}>Loading company information...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!companyInfo) {
    return (
      <div className="container mx-auto px-4 py-8" style={{ margin: 0, padding: 0, maxWidth: '100%', width: '100%' }}>
        <div className="dashboard-layout fix-layout">
          <main className="dashboard-content fix-content">
            <div className="content-wrapper fix-wrapper">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '4rem',
                color: '#6b7280'
              }}>
                <p style={{ fontWeight: '500' }}>Company information not available.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleCompanyInfoChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file' && files[0]) {
      setCompanyInfo({
        ...companyInfo,
        [name]: files[0]
      });
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = () => {
        // (local preview no longer needed)
      };
      reader.readAsDataURL(files[0]);
    } else {
      setCompanyInfo({
        ...companyInfo,
        [name]: value
      });
    }
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="content-wrapper" style={{ padding: '2rem', margin: '0 2rem' }}>
            <div className="page-header">
              <h1>Company Settings</h1>
              <p>View and manage your company information and configuration</p>
            </div>

            {/* Company Information Card */}
            <div className="card fix-card">
              <div className="card-header" style={{ 
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h2>Company Information</h2>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Below is the information associated with your company (read-only).
                </p>
              </div>

              {/* Company Logo and Admin Photo Section */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '2rem', 
                flexWrap: 'wrap', 
                gap: '2rem',
                padding: '1.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                {/* Admin Photo */}
                {currentUser && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '0.875rem'
                    }}>
                      👤 Company Admin
                    </label>
                    {currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto ? (
                      <img
                        src={getAssetUrl(currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto)}
                        alt={currentUser.name || 'Admin'}
                        style={{ 
                          height: '100px', 
                          width: '100px', 
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          border: '3px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    ) : (
                      <div style={{ 
                        height: '100px', 
                        width: '100px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 'bold', 
                        fontSize: '2.5rem',
                        border: '3px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}>
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                    )}
                    <div style={{ 
                      marginTop: '0.5rem',
                      textAlign: 'center',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      <div style={{ fontWeight: '600', color: '#374151' }}>
                        {currentUser.name || 'Unknown'}
                      </div>
                      <div>{currentUser.role || 'Admin'}</div>
                      {currentUser.email && (
                        <div style={{ fontSize: '0.75rem' }}>{currentUser.email}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Company Logo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.875rem'
                  }}>
                    🏢 Company Logo
                  </label>
                  {companyInfo.logoUrl || companyInfo.logo ? (
                    <div style={{
                      height: '100px',
                      width: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={getAssetUrl(companyInfo.logoUrl || companyInfo.logo)}
                        alt={companyInfo.name || 'Company Logo'}
                        style={{ 
                          maxHeight: '90px', 
                          maxWidth: '180px',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      height: '100px',
                      width: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      color: '#9ca3af',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      No Logo Available
                    </div>
                  )}
                </div>
              </div>

              {/* Company Details Form */}
              <div className="form-grid fix-form">
                <div className="form-group">
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    🏢 Company Name
                  </label>
                  <input 
                    type="text" 
                    value={companyInfo.name || ''} 
                    disabled 
                    readOnly 
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      backgroundColor: '#f9fafb',
                      color: '#374151',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    🌐 Company Domain
                  </label>
                  <input 
                    type="text" 
                    value={companyInfo.domain || companyInfo.companyDomain || ''} 
                    disabled 
                    readOnly 
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      backgroundColor: '#f9fafb',
                      color: '#374151',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    🏭 Industry
                  </label>
                  <input 
                    type="text" 
                    value={companyInfo.industry || ''} 
                    disabled 
                    readOnly 
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      backgroundColor: '#f9fafb',
                      color: '#374151',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    👥 Company Size
                  </label>
                  <input 
                    type="text" 
                    value={companyInfo.size || ''} 
                    disabled 
                    readOnly 
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      backgroundColor: '#f9fafb',
                      color: '#374151',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Project Information Section */}
                {(companyInfo.projectName || companyInfo.projectLogo) && (
                  <>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        📋 Project Name
                      </label>
                      <input 
                        type="text" 
                        value={companyInfo.projectName || ''} 
                        disabled 
                        readOnly 
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          backgroundColor: '#f9fafb',
                          color: '#374151',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Dynamically list any additional fields */}
                {Object.entries(companyInfo)
                  .filter(([key]) => !['name','domain','companyDomain','industry','size','logo','logoUrl','projectLogo','projectName','id','settings'].includes(key))
                  .map(([key, value]) => (
                    <div className="form-group full-width" key={key} style={{ gridColumn: '1 / -1' }}>
                      <label style={{ 
                        textTransform: 'capitalize',
                        display: 'block', 
                        marginBottom: '0.5rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        {key.replace(/_/g,' ')}
                      </label>
                      <input 
                        type="text" 
                        value={typeof value === 'string' ? value : JSON.stringify(value)} 
                        disabled 
                        readOnly 
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          backgroundColor: '#f9fafb',
                          color: '#374151',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  ))}
              </div>

              {/* Additional Information Section */}
              <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ 
                  marginBottom: '1rem',
                  color: '#1e293b',
                  fontSize: '1.125rem',
                  fontWeight: '600'
                }}>
                  ℹ️ Additional Information
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: '#64748b'
                }}>
                  <div>
                    <strong>Company ID:</strong> {companyInfo.id || 'N/A'}
                  </div>
                  <div>
                    <strong>Created:</strong> {companyInfo.createdAt ? new Date(companyInfo.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div>
                    <strong>Last Updated:</strong> {companyInfo.updatedAt ? new Date(companyInfo.updatedAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div>
                    <strong>Status:</strong> 
                    <span style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
    </div>
  );
};

export default CompanySettings;
