import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/dashboard.scss';
import RACIDashboard from './RACIDashboard';
import UserProfile from './UserProfile';
import TasksAssigned from './TasksAssigned';
import TaskCalendar from './TaskCalendar';
import HelpSupport from './HelpSupport';
import EventApprovals from './EventApprovals';
import authService from '../../src/services/auth.service';

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({});
  
  // Replace mock user data with state and fetch real user data
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
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await authService.getCurrentUser();
        console.log("Current user data:", userData);
        
        if (userData) {
          setUser({
            name: userData.name || "User",
            role: userData.role || "User",
            company: userData.company?.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            designation: userData.designation || "",
            employeeId: userData.employeeId || "",
            // Make sure department is properly handled to avoid "Not Assigned" text
            department: {
              name: userData.department?.name || ""
            },
            profileImage: userData.profileImage || null,
            // Add user ID for fetching financial limits
            id: userData.id
          });
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Use a separate useEffect to fetch RACI assignments with financial limits
  useEffect(() => {
    if (user && user.id) {
      fetchRACI(user.id);
    }
  }, [user.id]);
  
  const fetchRACI = async (userId) => {
    if (!userId) return;
    
    try {
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`/api/users/${userId}/raci-assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json' // Ensure we get JSON back
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("User RACI assignments response:", data);
        
        if (data && data.success && data.data && data.data.raciAssignments) {
          setFinancialLimits(data.data.raciAssignments);
          setRaciData(data);
        }
      } else {
        console.error("Failed to fetch RACI assignments:", response.status);
      }
    } catch (error) {
      console.error("Error fetching RACI assignments:", error);
    }
  };

  useEffect(() => {
    if (location.pathname === '/user' || location.pathname === '/user/') {
      navigate('/user/raci-dashboard', { replace: true });
    }
  }, [location.pathname]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      // Clear authentication data
      authService.logout();
      navigate('/');
    }
  };

  const renderFinancialLimits = () => {
    if (loading) {
      return <div className="loading-message">Loading financial limits...</div>;
    }

    // Check if we have financial limits data
    const hasFinancialLimits = financialLimits && financialLimits.some(
      item => item && item.financialLimits && 
      (item.financialLimits.min !== undefined || item.financialLimits.max !== undefined)
    );

    if (!hasFinancialLimits) {
      return null; // Don't show anything if no financial limits
    }

    return (
      <div className="financial-limits-section">
        <h3>Your Financial Limits</h3>
        <div className="financial-limits-list">
          {financialLimits.map((assignment, index) => {
            // Only display assignments that have financial limits
            if (!assignment.financialLimits) return null;
            
            return (
              <div key={index} className="financial-limit-item">
                <div className="limit-task-info">
                  <div className="limit-task-name">
                    <strong>{assignment.task?.name || 'Unnamed Task'}</strong>
                  </div>
                  <div className="limit-event-name">
                    {assignment.event?.name || 'Unnamed Event'}
                  </div>
                  <div className="limit-role">
                    Role: <span className="badge">{assignment.role || 'N/A'}</span>
                  </div>
                </div>
                <div className="limit-values">
                  {assignment.financialLimits.min !== undefined && (
                    <div className="limit-min">
                      Min: <span className="amount">₹{assignment.financialLimits.min}</span>
                    </div>
                  )}
                  {assignment.financialLimits.max !== undefined && (
                    <div className="limit-max">
                      Max: <span className="amount">₹{assignment.financialLimits.max}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">🔄</span>
          <span className="brand-name">Sharp RACI</span>
        </div>
        
        <div className="sidebar-user-info" style={{
          padding: '1rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div className="user-avatar" style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#4f46e5',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-name" style={{
            fontWeight: '600',
            fontSize: '1rem',
            color: 'white',
            textAlign: 'center'
          }}>
            {user.name}
          </div>
          <div className="user-role" style={{
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center'
          }}>
            {user.role}{user.department?.name ? ` - ${user.department.name}` : ''}
          </div>
        </div>
        
        <nav>
          <NavLink to="/user/raci-dashboard" className="nav-item">
            <i className="icon">📊</i> RACI Dashboard
          </NavLink>
          
          <div 
            className={`nav-item ${location.pathname.includes('/tasks') || location.pathname.includes('/calendar') ? 'active' : ''}`}
            onClick={() => toggleSection('tasks')}
          >
            <i className="icon">📝</i> 
            <span>My Tasks</span>
            <i className={`dropdown-icon ${expandedSections.tasks ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.tasks ? 'open' : ''}`}>
            <NavLink to="/user/tasks/assigned" className="nav-item">
              Assigned to Me
            </NavLink>
            <NavLink to="/user/tasks/calendar" className="nav-item">
              Task Calendar
            </NavLink>
          </div>
          
          <NavLink to="/user/profile" className="nav-item">
            <i className="icon">👤</i> My Profile
          </NavLink>
          
          <NavLink to="/user/help" className="nav-item">
            <i className="icon">❓</i> Help & Support
          </NavLink>
          
          {user.role?.toLowerCase() === 'hod' && (
            <NavLink to="/user/event-approvals" className="nav-item">
              <i className="icon">📝</i> Pending Approvals
            </NavLink>
          )}
          
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
          <div className="dashboard-title">{user.company || "Dashboard"}</div>
          <div className="header-actions">
            <div className="user-info">
              <div className="user-avatar">{user.name.charAt(0)}</div>
              <div className="user-details">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}{user.department?.name ? ` • ${user.department.name}` : ''}</div>
              </div>
            </div>
            {/* Logout button removed from header */}
          </div>
        </header>
        
        <div className="content-wrapper">
          {/* Add financial limits section directly in the dashboard */}
          {location.pathname === '/user/raci-dashboard' && renderFinancialLimits()}
          
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
          </Routes>
        </div>
      </main>
      
      <style jsx>{`
        .financial-limits-section {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .financial-limits-section h3 {
          margin-top: 0;
          font-size: 1.1rem;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .financial-limits-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .financial-limit-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 0.75rem;
        }
        
        .limit-task-info {
          flex: 2;
        }
        
        .limit-task-name {
          font-weight: 500;
          color: #111827;
          margin-bottom: 0.25rem;
        }
        
        .limit-event-name {
          color: #4b5563;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        
        .limit-role {
          font-size: 0.875rem;
        }
        
        .badge {
          display: inline-block;
          background-color: #e0f2fe;
          color: #0369a1;
          border-radius: 9999px;
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .limit-values {
          flex: 1;
          text-align: right;
        }
        
        .amount {
          color: #4f46e5;
          font-weight: 600;
        }
        
        .loading-message {
          text-align: center;
          padding: 1rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default UserDashboard;


