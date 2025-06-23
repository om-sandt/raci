import React, { useState, useEffect } from 'react';
import authService from '../../src/services/auth.service';
import env from '../../src/config/env';

const CompanySettings = () => {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user && user.company && user.company.id) {
          const token = localStorage.getItem('raci_auth_token');
          const response = await fetch(`${env.apiBaseUrl}/companies/${user.company.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            setCompanyInfo(data);
          } else {
            // Fallback to minimal company object from user info
            setCompanyInfo(user.company);
          }
        }
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to load company information', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyInfo();
  }, []);

  if (loading) {
    return <div>Loading company information…</div>;
  }

  if (!companyInfo) {
    return <div>Company information not available.</div>;
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

  return (
    <div>
      <div className="page-header">
        <h1>Company Details</h1>
        <p>Below is the information associated with your company (read-only).</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Company Information</h2>
        </div>

        {/* Admin photo left, company logo right */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '2rem' }}>
          {/* Admin Photo */}
          {currentUser && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Company Admin</label>
              {currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto ? (
                <img
                  src={getAssetUrl(currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto)}
                  alt={currentUser.name || 'Admin'}
                  style={{ height: '80px', width: '80px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ height: '80px', width: '80px', borderRadius: '50%', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem' }}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
            </div>
          )}

          {/* Company Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', textAlign: 'right' }}>Company Logo</label>
            {companyInfo.logoUrl || companyInfo.logo ? (
              <img
                src={getAssetUrl(companyInfo.logoUrl || companyInfo.logo)}
                alt={companyInfo.name || 'Company Logo'}
                style={{ maxHeight: '100px', maxWidth: '200px' }}
              />
            ) : (
              <span>N/A</span>
            )}
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Company Name</label>
            <input type="text" value={companyInfo.name || ''} disabled readOnly />
          </div>

          <div className="form-group">
            <label>Company Domain</label>
            <input type="text" value={companyInfo.domain || companyInfo.companyDomain || ''} disabled readOnly />
          </div>

          <div className="form-group">
            <label>Industry</label>
            <input type="text" value={companyInfo.industry || ''} disabled readOnly />
          </div>

          <div className="form-group">
            <label>Company Size</label>
            <input type="text" value={companyInfo.size || ''} disabled readOnly />
          </div>

          {/* Dynamically list any additional fields */}
          {Object.entries(companyInfo).filter(([key]) => !['name','domain','companyDomain','industry','size','logo','logoUrl','projectLogo','projectName','id','settings'].includes(key)).map(([key, value]) => (
            <div className="form-group full-width" key={key}>
              <label style={{ textTransform: 'capitalize' }}>{key.replace(/_/g,' ')}</label>
              <input type="text" value={typeof value === 'string' ? value : JSON.stringify(value)} disabled readOnly />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
