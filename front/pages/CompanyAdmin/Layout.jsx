import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../../styles/dashboard.scss';
import authService from '../../src/services/auth.service';
import apiService from '../../src/services/api';
import env from '../../src/config/env';

const CompanyAdminLayout = ({ children }) => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [companyData, setCompanyData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await authService.getCurrentUser();

        // If user lacks photo, fetch full user data to retrieve it
        if (user && ! (user.photo || user.photoUrl || user.profilePhoto)) {
          try {
            const token = localStorage.getItem('raci_auth_token');
            const resp = await fetch(`${env.apiBaseUrl}/users/${user.id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
              }
            });
            if (resp.ok) {
              const fullUser = await resp.json();
              setCurrentUser(fullUser);
            } else {
              setCurrentUser(user);
            }
          } catch {
            setCurrentUser(user);
          }
        } else {
          setCurrentUser(user);
        }

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
            setCompanyData(data);
          } else {
            setCompanyData({ id: user.company.id, name: user.company.name || 'Company' });
          }
        }
      } catch (err) {
        console.error('Failed loading layout data', err);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('raci_auth_token');
    navigate('/auth/login');
  };

  const getAssetUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    let base;
    if (env.apiBaseUrl.startsWith('http')) {
      base = env.apiBaseUrl.replace(/\/?api$/i, ''); // absolute: drop /api
    } else {
      base = env.apiBaseUrl; // relative '/api' kept for dev proxy
    }
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
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
            {/* Show company logo (or fallback letter) */}
            {companyData && (companyData.logoUrl || companyData.logo) ? (
              <img
                src={getAssetUrl(companyData.logoUrl || companyData.logo)}
                alt={companyData.name}
                style={{
                  width: '40px',
                  height: '40px',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  border: '1px solid #f3f4f6',
                  marginRight: '12px',
                  flexShrink: 0
                }}
                onError={(e) => {
                  console.log('Logo failed to load, using fallback');
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<div style=\"width: 40px; height: 40px; display: flex; align-items: center; justifyContent: center; background-color: #4f46e5; color: white; border-radius: 6px; font-size: 1.25rem; font-weight: bold;\">${companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}</div>`;
                }}
              />
            ) : (
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  marginRight: '12px',
                  flexShrink: 0
                }}
              >
                {companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}
              </div>
            )}
            <span style={{ fontWeight: '600', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white', letterSpacing: '0.5px' }}>
              {companyData ? companyData.name : 'Company'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/company-admin/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
            <span className="icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/company-admin/users" className={({ isActive }) => isActive ? "active" : ""}>
            <span className="icon">👥</span>
            <span>Users</span>
          </NavLink>
          <NavLink to="/company-admin/departments" className={({ isActive }) => isActive ? "active" : ""}>
            <span className="icon">🏢</span>
            <span>Departments</span>
          </NavLink>
          <NavLink to="/company-admin/events" className={({ isActive }) => isActive ? "active" : ""}>
            <span className="icon">📅</span>
            <span>Events</span>
          </NavLink>
          <NavLink to="/company-admin/event-list" className={({ isActive }) => isActive ? "active" : ""}>
            <span className="icon">📂</span>
            <span>Event List</span>
          </NavLink>
          <NavLink to="/company-admin/settings" className={({ isActive }) => isActive ? "active" : ""}>
            <span className="icon">⚙️</span>
            <span>Settings</span>
          </NavLink>
          <button onClick={handleLogout} className="sidebar-nav-item" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            color: '#374151',
            textDecoration: 'none',
            borderRadius: '0.375rem',
            marginBottom: '0.25rem',
            border: 'none',
            background: 'none',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            gap: '0.5rem',
            marginLeft: '0.5rem',
            height: '44px',
            transition: 'background-color 0.2s'
          }}>
            <span className="icon">🚪</span>
            <span>Logout</span>
          </button>

          {/* Sidebar user avatar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: 'auto'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#4f46e5',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '0.75rem',
              flexShrink: 0
            }}>
              {currentUser && (currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto) ? (
                <img
                  src={getAssetUrl(currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto)}
                  alt={currentUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </div>
            <span style={{ color: 'white', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser ? currentUser.name : 'User'}
            </span>
          </div>
        </nav>
        
      </aside>
      
      <main className="dashboard-content">
        <header className="dashboard-header">
          {/* New: Admin avatar on the far left */}
          <div className="header-left-avatar" style={{ display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
            <div className="user-avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden' }}>
              {currentUser && (currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto) ? (
                <img
                  src={getAssetUrl(currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto)}
                  alt={currentUser?.name || 'Admin'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
            </div>
          </div>
          <div className="dashboard-title">
            Drishti Admin Panel
          </div>
          <div className="header-actions">
            <div className="user-info">
              <span className="user-name">{currentUser ? currentUser.name : 'Admin'}</span>
              <div className="user-avatar" style={{ overflow: 'hidden' }}>
                {currentUser && (currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto) ? (
                  <img
                    src={getAssetUrl(currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto)}
                    alt={currentUser.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {children}
      </main>
    </div>
  );
};

export default CompanyAdminLayout;
