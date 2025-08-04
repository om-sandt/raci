import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/dashboard.scss';
import RACIDashboard from './RACIDashboard';
import UserProfile from './UserProfile';
import TasksAssigned from './TasksAssigned';
import TaskCalendar from './TaskCalendar';
import HelpSupport from './HelpSupport';
import EventApprovals from './EventApprovals';
import RACIApprovals from './RACIApprovals';
import Hierarchy from './Hierarchy';
import authService from '../../src/services/auth.service';
import env from '../../src/config/env';

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({
    name: "Loading...",
    role: "Loading...",
    company: "Loading...",
    email: "",
    phone: "",
    designation: "",
    employeeId: "",
    department: { name: "Loading..." }
  });
  
  const [loading, setLoading] = useState(true);
  const [financialLimits, setFinancialLimits] = useState([]);
  const [raciData, setRaciData] = useState(null);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showRaciDashboard, setShowRaciDashboard] = useState(false);
  const [companyData, setCompanyData] = useState(null);

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

  // Render company logo
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

  // Navigation sections for users
  const navigationSections = [
    {
      id: 'raci',
      title: 'RACI Dashboard',
      icon: '📊',
      color: '#4f46e5',
      path: '/user/raci-dashboard'
    },
    {
      id: 'tasks',
      title: 'My Tasks',
      icon: '📝',
      color: '#059669',
      subItems: [
        { title: 'Assigned to Me', path: '/user/tasks/assigned', icon: '📋' },
        { title: 'My Calendar', path: '/user/tasks/calendar', icon: '📅' }
      ]
    },
    {
      id: 'profile',
      title: 'My Profile',
      icon: '👤',
      color: '#dc2626',
      path: '/user/profile'
    },
    {
      id: 'approvals',
      title: 'RACI Approvals',
      icon: '📋',
      color: '#7c3aed',
      path: '/user/raci-approvals'
    }
  ];

  // Add HOD-specific sections if user role is hod
  const finalNavigationSections = [...navigationSections];
  console.log('UserDashboard: User role:', user.role, 'lowercase:', user.role?.toLowerCase());
  if (user.role?.toLowerCase() === 'hod') {
    console.log('UserDashboard: Adding HOD-specific sections');
    finalNavigationSections.push(
      {
        id: 'event-approvals',
        title: 'Event Approvals',
        icon: '📝',
        color: '#0891b2',
        path: '/user/event-approvals'
      },
      {
        id: 'hierarchy',
        title: 'Hierarchy',
        icon: '🏢',
        color: '#be185d',
        path: '/user/hierarchy'
      }
    );
  } else {
    console.log('UserDashboard: User is not HOD, not adding HOD sections');
  }
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await authService.getCurrentUser();
        
        console.log('UserDashboard: Raw user data from API:', userData);
        
        // Ensure user data is properly formatted
        const formattedUser = {
          name: userData?.name || userData?.fullName || "User",
          role: userData?.role || userData?.designation || "User",
          company: userData?.company?.name || userData?.companyName || "",
          email: userData?.email || "",
          phone: userData?.phone || "",
          designation: userData?.designation || userData?.title || "",
          employeeId: userData?.employeeId || userData?.id || "",
          department: {
            name: userData?.department?.name || userData?.departmentName || ""
          },
          profileImage: userData?.profileImage || null,
          id: userData?.id || userData?.userId
        };
        
        console.log('UserDashboard: Formatted user data:', formattedUser);
        setUser(formattedUser);
        
        // Fetch company data for logo
        if (userData && userData.company && userData.company.id) {
          try {
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/${userData.company.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const companyDetails = await response.json();
              setCompanyData(companyDetails);
            } else {
              // Set minimal company data from user object
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
        
        // Fetch financial limits
        try {
          const token = localStorage.getItem('raci_auth_token');
          const response = await fetch(`${window.location.origin}/api/financial-limits`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const limitsData = await response.json();
            setFinancialLimits(limitsData.data || limitsData || []);
          }
        } catch (error) {
          console.error('Error fetching financial limits:', error);
          setFinancialLimits([]);
        }
        
        // Fetch RACI data
        try {
          const token = localStorage.getItem('raci_auth_token');
          const response = await fetch(`${window.location.origin}/api/raci-data`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const raciResponse = await response.json();
            setRaciData(raciResponse.data || raciResponse);
          }
        } catch (error) {
          console.error('Error fetching RACI data:', error);
          setRaciData(null);
        }
        
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };

  const handleSectionClick = (section) => {
    if (section.path) {
      // Direct navigation for single items
      if (section.path === '/user/raci-dashboard') {
        // If already on dashboard, show the RACI dashboard overview
        setShowSubMenu(false);
        setSelectedSection(null);
        setShowRaciDashboard(true);
      } else {
        navigate(section.path);
      }
    } else if (section.subItems) {
      // Show sub-menu for sections with sub-items
      setSelectedSection(section);
      setShowSubMenu(true);
      setShowRaciDashboard(false);
    }
  };

  const handleSubItemClick = (path) => {
    setShowSubMenu(false);
    setSelectedSection(null);
    navigate(path);
  };

  const handleBackToDashboard = () => {
    setShowSubMenu(false);
    setSelectedSection(null);
    navigate('/user/raci-dashboard');
    setShowRaciDashboard(false);
  };

  // If we're on a sub-page (not the main dashboard), show the sub-page layout
  if (location.pathname !== '/user/raci-dashboard' && !showSubMenu && !showRaciDashboard) {
    return (
      <div className="dashboard-layout-new">
        <header className="dashboard-header-new">
          <div className="header-left">
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
                marginRight: '1rem'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              ←
            </button>
            <div className="company-info">
              {renderCompanyLogo()}
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                  {user.company || 'User Dashboard'}
                </h1>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                  {location.pathname.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}{user.department?.name ? ` • ${user.department.name}` : ''}</div>
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
          <Routes>
            <Route path="/raci-dashboard" element={<RACIDashboard 
              userData={user} 
              financialLimits={financialLimits}
              raciData={raciData}
              isLoading={loading} 
            />} />
            <Route path="/profile" element={<UserProfile userData={user} />} />
            <Route path="/tasks/assigned" element={<TasksAssigned 
              userData={user}
              financialLimits={financialLimits}
              raciData={raciData}
            />} />
            <Route path="/tasks/calendar" element={<TaskCalendar />} />
            <Route path="/help" element={<HelpSupport />} />
            <Route path="/event-approvals" element={<EventApprovals userData={user} />} />
            <Route path="/hierarchy" element={<Hierarchy />} />
            <Route path="/raci-approvals" element={<RACIApprovals userData={user} />} />
          </Routes>
        </main>
      </div>
    );
  }

  // Main dashboard view with card navigation
  return (
    <div className="dashboard-layout-new">
      <header className="dashboard-header-new">
        <div className="header-left">
          {(showSubMenu || showRaciDashboard || location.pathname !== '/user/raci-dashboard') && (
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
                marginRight: '1rem'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              ←
            </button>
          )}
          <div className="company-info">
            {renderCompanyLogo()}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                {user.company || 'User Dashboard'}
              </h1>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}{user.department?.name ? ` • ${user.department.name}` : ''}</div>
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
        {showSubMenu && selectedSection ? (
          <div className="sub-menu-container" style={{
            padding: '2rem',
            margin: '0 2rem',
            animation: 'slideInUp 0.3s ease-out'
          }}>
            <div className="sub-menu-header" style={{
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <h2 style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: '#111827',
                marginBottom: '0.5rem'
              }}>
                {selectedSection.title}
              </h2>
              <p style={{ 
                fontSize: '1rem', 
                color: '#6b7280',
                margin: 0
              }}>
                Select an option to continue
              </p>
            </div>
            
            <div className="sub-menu-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {selectedSection.subItems.map((item, index) => (
                <div
                  key={item.path}
                  className="sub-menu-card"
                  onClick={() => handleSubItemClick(item.path)}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '2px solid transparent',
                    animation: `slideInUp 0.3s ease-out ${index * 0.1}s both`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-4px)';
                    e.target.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    e.target.style.borderColor = selectedSection.color;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                    e.target.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{
                    fontSize: '2.5rem',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: `${selectedSection.color}15`,
                    color: selectedSection.color
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.25rem', 
                      fontWeight: '600', 
                      color: '#111827',
                      marginBottom: '0.25rem'
                    }}>
                      {item.title}
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.875rem', 
                      color: '#6b7280' 
                    }}>
                      Click to access {item.title.toLowerCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : showRaciDashboard ? (
          <div className="raci-dashboard-container" style={{
            padding: '2rem',
            margin: '0 2rem',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <RACIDashboard />
          </div>
        ) : (
          <div className="dashboard-grid" style={{
            padding: '2rem',
            margin: '0 2rem',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div className="dashboard-header-section" style={{
              textAlign: 'center',
              marginBottom: '3rem'
            }}>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                color: '#111827',
                marginBottom: '1rem'
              }}>
                User Dashboard
              </h1>
              <p style={{ 
                fontSize: '1.125rem', 
                color: '#6b7280',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Manage your tasks, view RACI information, and access your profile
              </p>
            </div>

            <div className="navigation-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              maxWidth: '1400px',
              margin: '0 auto'
            }}>
              {finalNavigationSections.map((section, index) => (
                <div
                  key={section.id}
                  className="navigation-card"
                  onClick={() => handleSectionClick(section)}
                  style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '2rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '3px solid transparent',
                    animation: `slideInUp 0.5s ease-out ${index * 0.1}s both`,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-8px) scale(1.02)';
                    e.target.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                    e.target.style.borderColor = section.color;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    e.target.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{
                    fontSize: '3rem',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    background: `${section.color}15`,
                    color: section.color,
                    marginBottom: '1.5rem',
                    flexShrink: 0
                  }}>
                    {section.icon}
                  </div>
                  
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>
                    {section.title}
                  </h3>
                  
                  <p style={{ 
                    margin: 0, 
                    fontSize: '1rem', 
                    color: '#6b7280',
                    marginBottom: '1rem',
                    lineHeight: '1.6'
                  }}>
                    {section.subItems ? 
                      `Manage ${section.title.toLowerCase()} with ${section.subItems.length} options` :
                      `Access ${section.title.toLowerCase()}`
                    }
                  </p>
                  
                  {section.subItems && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: section.color,
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}>
                      <span>{section.subItems.length} options</span>
                      <span style={{ fontSize: '1.2rem' }}>→</span>
                    </div>
                  )}
                  
                  {!section.subItems && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: section.color,
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}>
                      <span>Access now</span>
                      <span style={{ fontSize: '1.2rem' }}>→</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx="true">{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
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
        
        .navigation-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .navigation-card:hover {
          transform: translateY(-8px) scale(1.02);
        }
        
        .sub-menu-card:hover {
          transform: translateY(-4px);
        }
      `}</style>
    </div>
  );
};

export default UserDashboard;


