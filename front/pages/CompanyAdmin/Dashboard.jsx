import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/dashboard.scss';
import UserCreation from './UserCreation';
import UserManagement from './UserManagement';
import CreateDepartment from './CreateDepartment';
import DepartmentManagement from './DepartmentManagement';
import CreateDesignation from './CreateDesignation';
import DesignationManagement from './DesignationManagement';
import CreateLocation from './CreateLocation';
import LocationManagement from './LocationManagement';
import CreateDivision from './CreateDivision';
import UpdateDivision from './UpdateDivision';
import EventMaster from './EventMaster';
import EventList from './EventList';
import RACIAssignment from './RACIAssignment';
import RACITracker from './RACITracker';
import MeetingCalendar from './MeetingCalendar';
import Hierarchy from './Hierarchy';
import CompanySettings from './CompanySettings';
import AdminDashboard from './AdminDashboard';
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

const CompanyAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalUsers: 3,
    totalDepartments: 3,
    totalEvents: 3,
    pendingApprovals: 1,
    approvedEvents: 2,
    rejectedEvents: 0,
    totalDesignations: 3,
    totalLocations: 3
  });
  const [showDashboardOverview, setShowDashboardOverview] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    departments: [
      { id: 1, name: 'Marketing', description: 'Marketing Department' },
      { id: 2, name: 'Finance', description: 'Finance Department' },
      { id: 3, name: 'HR', description: 'Human Resources Department' }
    ],
    users: [
      { id: 1, name: 'John Doe', role: 'user', department: { name: 'Marketing' } },
      { id: 2, name: 'Jane Smith', role: 'hod', department: { name: 'Finance' } },
      { id: 3, name: 'Bob Johnson', role: 'company_admin', department: { name: 'HR' } }
    ],
    events: [
      { id: 1, name: 'Annual Meeting', status: 'approved', createdAt: new Date().toISOString() },
      { id: 2, name: 'Team Building', status: 'pending', createdAt: new Date().toISOString() },
      { id: 3, name: 'Project Review', status: 'approved', createdAt: new Date().toISOString() }
    ],
    designations: [
      { id: 1, name: 'Manager' },
      { id: 2, name: 'Senior Executive' },
      { id: 3, name: 'Junior Executive' }
    ],
    locations: [
      { id: 1, name: 'Head Office' },
      { id: 2, name: 'Branch Office' },
      { id: 3, name: 'Remote Office' }
    ]
  });
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Navigation sections with their sub-items
  const navigationSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '📊',
      color: '#1f2937',
      path: '/company-admin/dashboard'
    },
    {
      id: 'users',
      title: 'User Administration',
      icon: '👥',
      color: '#4f46e5',
      subItems: [
        { title: 'Create User', path: '/company-admin/user-creation', icon: '➕' },
        { title: 'Update User', path: '/company-admin/user-management', icon: '✏️' }
      ]
    },
    {
      id: 'divisions',
      title: 'Division Management',
      icon: '🏬',
      color: '#059669',
      subItems: [
        { title: 'Create Division', path: '/company-admin/create-division', icon: '➕' },
        { title: 'Update Division', path: '/company-admin/update-division', icon: '✏️' }
      ]
    },
    {
      id: 'departments',
      title: 'Department Workspace',
      icon: '🏢',
      color: '#dc2626',
      subItems: [
        { title: 'Create Department', path: '/company-admin/department-creation', icon: '➕' },
        { title: 'Manage Departments', path: '/company-admin/department-management', icon: '✏️' }
      ]
    },
    {
      id: 'designations',
      title: 'Designation Directory',
      icon: '🏷️',
      color: '#ea580c',
      subItems: [
        { title: 'Create Designation', path: '/company-admin/designation-creation', icon: '➕' },
        { title: 'Update Designation', path: '/company-admin/designation-management', icon: '✏️' }
      ]
    },
    {
      id: 'locations',
      title: 'Location Center',
      icon: '📍',
      color: '#7c3aed',
      subItems: [
        { title: 'Create Location', path: '/company-admin/location-creation', icon: '➕' },
        { title: 'Update Location', path: '/company-admin/location-management', icon: '✏️' }
      ]
    },
    {
      id: 'raci',
      title: 'RACI Operations',
      icon: '📅',
      color: '#0891b2',
      subItems: [
        { title: 'Event Master', path: '/company-admin/event-master', icon: '📋' },
        { title: 'Event List', path: '/company-admin/event-list', icon: '📂' },
        { title: 'RACI Assignment', path: '/company-admin/raci-assignment', icon: '📝' },
        { title: 'RACI Tracker', path: '/company-admin/raci-tracker', icon: '📊' }
      ]
    },
    {
      id: 'meetings',
      title: 'Meeting Calendar',
      icon: '📆',
      color: '#be185d',
      path: '/company-admin/meeting-calendar'
    },
    {
      id: 'hierarchy',
      title: 'Hierarchy',
      icon: '🏢',
      color: '#16a34a',
      path: '/company-admin/hierarchy'
    },
    {
      id: 'settings',
      title: 'Company Settings',
      icon: '⚙️',
      color: '#6b7280',
      path: '/company-admin/settings'
    }
  ];
  
  // Load user and company data
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        
        if (userData && userData.company && userData.company.id) {
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
        setLoading(false);
      }
    };
    
    fetchUserAndCompany();
  }, []);

  // Fetch dashboard data when overview is shown
  useEffect(() => {
    if (showDashboardOverview && companyData?.id) {
      fetchDashboardData();
    }
  }, [showDashboardOverview, companyData?.id]);

  // Function to fetch dashboard data
    const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      
      let departments = [];
      let users = [];
      let events = [];
      let designations = [];
      let locations = [];

      // Fetch departments
      try {
        const deptResponse = await apiService.get(`/companies/${companyData?.id}/departments`);
        departments = deptResponse?.departments || deptResponse || [];
        console.log('Departments fetched:', departments);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
      
      // Fetch users - use correct endpoint with query parameters
      try {
        const usersResponse = await apiService.get(`/users?companyId=${companyData?.id}`);
        users = usersResponse?.users || usersResponse || [];
        console.log('Users fetched:', users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
      
      // Fetch events - use correct endpoint with query parameters
      try {
        const eventsResponse = await apiService.get(`/events?companyId=${companyData?.id}`);
        events = eventsResponse?.events || eventsResponse || [];
        console.log('Events fetched:', events);
      } catch (error) {
        console.error('Error fetching events:', error);
      }

      // Fetch designations
      try {
        const designationsResponse = await apiService.get('/designations');
        designations = designationsResponse?.designations || designationsResponse || [];
        console.log('Designations fetched:', designations);
      } catch (error) {
        console.error('Error fetching designations:', error);
      }

      // Fetch locations
      try {
        const locationsResponse = await apiService.get('/locations');
        locations = locationsResponse?.locations || locationsResponse || [];
        console.log('Locations fetched:', locations);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
      
      // Update dashboard data
      setDashboardData({
        departments,
        users,
        events,
        designations,
        locations
      });
      
      // Update analytics with fetched data
      const pendingEvents = events.filter(event => event.status === 'pending').length;
      const approvedEvents = events.filter(event => event.status === 'approved').length;
      const rejectedEvents = events.filter(event => event.status === 'rejected').length;
      
      setAnalytics({
        totalUsers: users.length,
        totalDepartments: departments.length,
        totalEvents: events.length,
        pendingApprovals: pendingEvents,
        approvedEvents,
        rejectedEvents,
        totalDesignations: designations.length,
        totalLocations: locations.length
      });
      
      console.log('Dashboard data updated:', {
        departments: departments.length,
        users: users.length,
        events: events.length,
        designations: designations.length,
        locations: locations.length,
        analytics: {
          totalUsers: users.length,
          totalDepartments: departments.length,
          totalEvents: events.length,
          pendingApprovals: pendingEvents
        }
      });
      
      } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Set fallback data to ensure dashboard shows something
      setDashboardData({
        departments: [],
        users: [],
        events: [],
        designations: [],
        locations: []
      });
      
      setAnalytics({
        totalUsers: 0,
        totalDepartments: 0,
        totalEvents: 0,
        pendingApprovals: 0,
        approvedEvents: 0,
        rejectedEvents: 0,
        totalDesignations: 0,
        totalLocations: 0
      });
      } finally {
      setLoadingDashboard(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };

  const handleSectionClick = (section) => {
    if (section.path) {
      // Direct navigation for single items
      if (section.path === '/company-admin/dashboard') {
        // If already on dashboard, show the dashboard overview
        setShowSubMenu(false);
        setSelectedSection(null);
        setShowDashboardOverview(true);
        fetchDashboardData(); // Fetch dashboard data when showing overview
      } else {
        navigate(section.path);
      }
    } else if (section.subItems) {
      // Show sub-menu for sections with sub-items
      setSelectedSection(section);
      setShowSubMenu(true);
      setShowDashboardOverview(false);
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
    navigate('/company-admin/dashboard');
    setShowDashboardOverview(false); // Hide dashboard overview when going back to main dashboard
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

  // Render project logo
  const renderProjectLogo = () => {
    if (!companyData) return null;
    const rawLogo = companyData.projectLogo || companyData.project_logo;
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
            alt={companyData?.projectName || 'Project'}
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
    return null;
  };

  // Render user photo
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
            parent.innerHTML = `<div style="width: 100%; height: 100%; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</div>`;
          }}
        />
      );
    }
    return currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  };

  // If we're on a sub-page, show the sub-menu
  if (location.pathname !== '/company-admin/dashboard') {
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
                  {companyData ? companyData.projectName : 'Project'} Administration
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
          <Routes>
            <Route path="/user-creation" element={<UserCreation />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/department-creation" element={<CreateDepartment />} />
            <Route path="/department-management" element={<DepartmentManagement />} />
            <Route path="/designation-creation" element={<CreateDesignation />} />
            <Route path="/designation-management" element={<DesignationManagement />} />
            <Route path="/location-creation" element={<CreateLocation />} />
            <Route path="/location-management" element={<LocationManagement />} />
            <Route path="/create-division" element={<CreateDivision />} />
            <Route path="/update-division" element={<UpdateDivision />} />
            <Route path="/event-master" element={<EventMaster />} />
            <Route path="/event-list" element={<EventList />} />
            <Route path="/raci-assignment" element={<RACIAssignment />} />
            <Route path="/raci-tracker" element={<RACITracker />} />
            <Route path="/meeting-calendar" element={<MeetingCalendar />} />
            <Route path="/hierarchy" element={<Hierarchy />} />
            <Route path="/settings" element={<CompanySettings />} />
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
          <div className="company-info">
            {(showSubMenu && selectedSection) || showDashboardOverview ? (
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
            ) : null}
            {renderCompanyLogo()}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                {companyData ? companyData.name : 'Company'} Administration
              </h1>
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
        ) : showDashboardOverview ? (
          <div className="dashboard-overview-container" style={{
            padding: '2rem',
            margin: '0 2rem',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <AdminDashboard 
              dashboardStats={analytics}
              departments={dashboardData.departments}
              users={dashboardData.users}
              events={dashboardData.events}
              designations={dashboardData.designations}
              locations={dashboardData.locations}
              loading={loadingDashboard}
            />
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                gap: '1rem'
              }}>
                {renderProjectLogo()}
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: '800', 
                  color: '#111827',
                  margin: 0
                }}>
                  {companyData ? companyData.projectName : 'Project'} Dashboard Overview
                </h1>
              </div>
              <p style={{ 
                fontSize: '1.125rem', 
                color: '#6b7280',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Manage your company's RACI operations, users, departments, and more
              </p>
          </div>
          
            <div className="navigation-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              maxWidth: '1400px',
              margin: '0 auto'
            }}>
              {navigationSections.map((section, index) => (
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

export default CompanyAdminDashboard;