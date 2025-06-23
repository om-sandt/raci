import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';
import UserCreation from './UserCreation';
import DepartmentManagement from './DepartmentManagement';
import UserManagement from './UserManagement';
import EventMaster from './EventMaster';
import RACIAssignment from './RACIAssignment';
import RACITracker from './RACITracker.jsx';
import MeetingCalendar from './MeetingCalendar';
import CompanySettings from './CompanySettings';
import CreateUser from './CreateUser';
import EditUser from './EditUser';
import CreateDepartment from './CreateDepartment';
import EditDepartment from './EditDepartment';
import AdminDashboard from './AdminDashboard'; // Make sure this points to the correct file
import env from '../../src/config/env';

// Helper to build correct asset URLs (consistent with Layout)
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
  console.log("CompanyAdminDashboard rendering, pathname:", window.location.pathname);
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({});
  
  const [currentUser, setCurrentUser] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // State for dashboard data
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState({
    departments: true,
    users: true,
    events: true,
    stats: true
  });
  
  // Load user and company data
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        // Get current user
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        
        // Get company data if user has a company ID
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

  // Make sure we have a fallback if route redirection fails
  useEffect(() => {
    console.log("Current location path:", location.pathname);
    if (location.pathname === '/company-admin' || location.pathname === '/company-admin/') {
      console.log("Redirecting to dashboard");
      navigate('/company-admin/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      navigate('/');
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser || !currentUser.company || !currentUser.company.id) {
        return;
      }

      const companyId = currentUser.company.id;

      // Fetch company stats with better error handling
      try {
        setLoading(prev => ({ ...prev, stats: true }));
        const token = localStorage.getItem('raci_auth_token');
        
        try {
          const response = await fetch(`${env.apiBaseUrl}/dashboard/company-admin`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const stats = await response.json();
            setDashboardStats(stats);
          } else if (response.status === 501) {
            console.log('Stats API not implemented, using mock data');
            setDashboardStats({
              totalUsers: 0,
              totalDepartments: 0,
              totalEvents: 0,
              pendingApprovals: 0
            });
          }
        } catch (err) {
          console.warn('Stats API error, using mock data:', err);
          setDashboardStats({
            totalUsers: 0,
            totalDepartments: 0,
            totalEvents: 0,
            pendingApprovals: 0
          });
        }
      } catch (error) {
        console.error('Error setting up dashboard stats:', error);
      } finally {
        setLoading(prev => ({ ...prev, stats: false }));
      }

      // Fetch departments
      try {
        setLoading(prev => ({ ...prev, departments: true }));
        const departmentsData = await apiService.get(`/companies/${companyId}/departments`);
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
        
        // Update stats with real department count
        setDashboardStats(prev => ({
          ...prev,
          totalDepartments: Array.isArray(departmentsData) ? departmentsData.length : 0
        }));
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoading(prev => ({ ...prev, departments: false }));
      }

      // Fetch users in company
      try {
        setLoading(prev => ({ ...prev, users: true }));
        const usersData = await apiService.get(`/users?companyId=${companyId}`);
        
        // Handle different response formats
        let usersList = [];
        if (usersData && usersData.users) {
          usersList = usersData.users;
        } else if (Array.isArray(usersData)) {
          usersList = usersData;
        }
        
        setUsers(usersList);
        
        // Update stats with real user count
        setDashboardStats(prev => ({
          ...prev,
          totalUsers: usersList.length
        }));
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(prev => ({ ...prev, users: false }));
      }

      // Fetch events
      try {
        setLoading(prev => ({ ...prev, events: true }));
        const eventsData = await apiService.get('/events');
        
        // Handle different response formats
        let eventsList = [];
        if (eventsData && eventsData.events) {
          eventsList = eventsData.events;
        } else if (Array.isArray(eventsData)) {
          eventsList = eventsData;
        }
        
        setEvents(eventsList);
        
        // Update stats with real event count and pending approvals
        const pendingEvents = eventsList.filter(event => event.status === 'pending').length;
        setDashboardStats(prev => ({
          ...prev,
          totalEvents: eventsList.length,
          pendingApprovals: pendingEvents
        }));
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(prev => ({ ...prev, events: false }));
      }
    };

    if (currentUser && currentUser.company) {
      fetchDashboardData();
    }
  }, [currentUser]);

  // Add enhanced logo rendering method
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

  // NEW: Render project logo (used in header)
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

  // NEW: Render current user profile photo (used top-right)
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
      <aside className="sidebar">
        <div className="brand" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px',
          height: '64px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
            {renderCompanyLogo()}
            <span style={{ 
              fontWeight: '600', 
              fontSize: '16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'white',
              letterSpacing: '0.5px',
              marginRight: '8px'
            }}>
              {companyData ? companyData.name : 'Company'}
            </span>
          </div>
        </div>
        
        <nav>
          <NavLink to="/company-admin/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="icon">📊</i> Dashboard
          </NavLink>

          <div 
            className={`nav-item ${location.pathname.includes('/user-') ? 'active' : ''}`}
            onClick={() => toggleSection('users')}
          >
            <i className="icon">👥</i> 
            <span>User Administration</span>
            <i className={`dropdown-icon ${expandedSections.users ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.users ? 'open' : ''}`}>
            <NavLink to="/company-admin/user-creation" className="nav-item">
              User Creation
            </NavLink>
            <NavLink to="/company-admin/user-management" className="nav-item">
              User Management
            </NavLink>
          </div>
          
          <div 
            className={`nav-item ${location.pathname.includes('/department') ? 'active' : ''}`}
            onClick={() => toggleSection('departments')}
          >
            <i className="icon">🏢</i> 
            <span>Department Management</span>
            <i className={`dropdown-icon ${expandedSections.departments ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.departments ? 'open' : ''}`}>
            <NavLink to="/company-admin/department-management" className="nav-item">
              Department List
            </NavLink>
            <NavLink to="/company-admin/department-creation" className="nav-item">
                         Create Department
                       </NavLink>
          </div>
          
          <div 
            className={`nav-item ${location.pathname.includes('/event-master') || location.pathname.includes('/raci-') ? 'active' : ''}`}
            onClick={() => toggleSection('raci')}
          >
            <i className="icon">📅</i> 
            <span>RACI Management</span>
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
            alignItems: 'center'
          }}>
            <i className="icon">🚪</i> Logout
          </button>
        </nav>
      </aside>
      
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
        
        <div className="content-wrapper">
          <Routes>
            {/* Changed to have proper path pattern */}
            <Route path="dashboard/*" element={<AdminDashboard />} />
            <Route path="user-creation" element={<CreateUser />} />
            <Route path="department-management" element={<DepartmentManagement />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="event-master" element={<EventMaster />} />
            <Route path="raci-assignment" element={<RACIAssignment />} />
            <Route path="raci-tracker" element={<RACITracker />} />
            <Route path="meeting-calendar" element={<MeetingCalendar />} />
            <Route path="settings" element={<CompanySettings />} />
            
            {/* Other routes - also changed to relative paths */}
            <Route path="users/edit/:id" element={<EditUser />} />
            <Route path="departments/create" element={<CreateDepartment />} />
            <Route path="departments/edit/:id" element={<EditDepartment />} />
            
            {/* Add a default route to handle the root path */}
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<AdminDashboard />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default CompanyAdminDashboard;
