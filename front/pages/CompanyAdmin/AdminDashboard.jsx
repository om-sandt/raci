import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../src/services/auth.service';
import meetingService from '../../src/services/meeting.service';
import env from '../../src/config/env';
import '../../styles/dashboard.scss';

const AdminDashboard = ({ dashboardStats, departments, users, events, designations, locations, loading: parentLoading }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    company: {
      name: '',
      logoUrl: '',
      projectName: '',
      projectLogo: '',
      domain: '',
      industry: '',
      size: ''
    },
    stats: {
      users: {
        total: 0,
        company_admin: 0,
        hod: 0,
        user: 0
      },
      departments: 0,
      locations: 0,
      designations: 0,
      events: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      }
    },
    recentEvents: [],
    upcomingMeetings: []
  });

  // Debug flag to show raw data for development
  const [showDebugData, setShowDebugData] = useState(false);
  const [rawResponseData, setRawResponseData] = useState(null);
  
  // Meetings loading state
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  
  // Meeting filters for upcoming meetings section
  const [meetingFilters, setMeetingFilters] = useState({
    dateRange: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    },
    eventFilter: '',
    statusFilter: 'upcoming' // upcoming, all, today, this-week
  });

  // Update loading state based on parent loading
  useEffect(() => {
    const isAnyLoading = parentLoading && (
      parentLoading.departments || 
      parentLoading.users || 
      parentLoading.events || 
      parentLoading.designations || 
      parentLoading.locations || 
      parentLoading.stats
    );
    setLoading(isAnyLoading);
  }, [parentLoading]);
  
  // Load meetings when component mounts and filters change
  useEffect(() => {
    fetchUpcomingMeetings();
  }, [meetingFilters]);

  // Function to fetch upcoming meetings with filters
  const fetchUpcomingMeetings = async () => {
    try {
      setMeetingsLoading(true);
      
      // Try to fetch meetings from API
      const meetingsData = await meetingService.getAllMeetings({
        startDate: meetingFilters.dateRange.startDate,
        endDate: meetingFilters.dateRange.endDate,
        limit: 100 // Get more meetings to filter
      });
      
      // Handle different response formats
      let meetingsList = [];
      if (meetingsData && meetingsData.meetings) {
        meetingsList = meetingsData.meetings;
      } else if (Array.isArray(meetingsData)) {
        meetingsList = meetingsData;
      }
      
      // Apply filters
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      let filteredMeetings = meetingsList.filter(meeting => {
        const dateValue = meeting.date || meeting.scheduledAt || meeting.startTime || meeting.meetingDate;
        if (!dateValue) return false; // Skip meetings without dates
        
        const meetingDate = new Date(dateValue);
        if (isNaN(meetingDate.getTime())) return false; // Skip invalid dates
        
        // Apply status filter
        switch (meetingFilters.statusFilter) {
          case 'today':
            return meetingDate.toDateString() === today.toDateString();
          case 'this-week':
            return meetingDate >= today && meetingDate <= weekFromNow;
          case 'upcoming':
            return meetingDate >= today;
          case 'all':
            return true;
          default:
            return meetingDate >= today;
        }
      });
      
      // Apply event filter
      if (meetingFilters.eventFilter) {
        filteredMeetings = filteredMeetings.filter(meeting => {
          const eventName = meeting.eventName || meeting.event?.name || '';
          return eventName.toLowerCase().includes(meetingFilters.eventFilter.toLowerCase());
        });
      }
      
      // Sort by date and limit to 10 meetings for display
      filteredMeetings = filteredMeetings
        .sort((a, b) => {
          const dateA = new Date(a.date || a.scheduledAt || a.startTime || a.meetingDate);
          const dateB = new Date(b.date || b.scheduledAt || b.startTime || b.meetingDate);
          return dateA - dateB;
        })
        .slice(0, 10);
      
      setDashboardData(prev => ({
        ...prev,
        upcomingMeetings: filteredMeetings
      }));
      
    } catch (error) {
      console.log('Meetings API not available yet, using mock data:', error.message);
      
      // Use mock data for upcoming meetings while API is being developed
      const mockMeetings = [
        {
          id: 1,
          title: 'Weekly Team Standup',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          time: '9:00 AM',
          startTime: '9:00 AM',
          location: 'Conference Room A',
          attendees: ['John Doe', 'Jane Smith', 'Bob Johnson'],
          organizer: 'Team Lead'
        },
        {
          id: 2,
          title: 'Project Review Meeting',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
          time: '2:00 PM',
          startTime: '2:00 PM',
          location: 'Zoom Meeting',
          attendees: ['Alice Brown', 'Charlie Wilson'],
          organizer: 'Project Manager'
        },
        {
          id: 3,
          title: 'Department All-Hands',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          time: '10:00 AM',
          startTime: '10:00 AM',
          location: 'Main Auditorium',
          attendees: ['All Department Staff'],
          organizer: 'Department Head'
        },
        {
          id: 4,
          title: 'Budget Planning Session',
          date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
          time: '11:30 AM',
          startTime: '11:30 AM',
          location: 'Finance Conference Room',
          attendees: ['Finance Team', 'Management'],
          organizer: 'CFO'
        },
        {
          id: 5,
          title: 'Client Presentation',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          time: '3:45 PM',
          startTime: '3:45 PM',
          location: 'Presentation Hall',
          attendees: ['Sales Team', 'Client Representatives'],
          organizer: 'Sales Manager'
        }
      ];
      
      setDashboardData(prev => ({
        ...prev,
        upcomingMeetings: mockMeetings
      }));
    } finally {
      setMeetingsLoading(false);
    }
  };

  // Update dashboard data when props change
  useEffect(() => {
    if (dashboardStats) {
      setDashboardData(prev => ({
        ...prev,
        stats: {
          users: {
            total: dashboardStats.totalUsers || 0,
            company_admin: users?.filter(u => u.role === 'company_admin').length || 0,
            hod: users?.filter(u => u.role === 'hod').length || 0,
            user: users?.filter(u => u.role === 'user').length || 0
          },
          departments: dashboardStats.totalDepartments || departments?.length || 0,
          locations: dashboardStats.totalLocations || locations?.length || 0,
          designations: dashboardStats.totalDesignations || designations?.length || 0,
          events: {
            total: dashboardStats.totalEvents || events?.length || 0,
            pending: dashboardStats.pendingApprovals || events?.filter(e => e.status === 'pending').length || 0,
            approved: events?.filter(e => e.status === 'approved').length || 0,
            rejected: events?.filter(e => e.status === 'rejected').length || 0
          }
        },
        recentEvents: events?.slice(0, 5) || []
      }));
      
      // Store debug data
      setRawResponseData({
        dashboardStats,
        departments: departments?.length || 0,
        users: users?.length || 0,
        events: events?.length || 0,
        designations: designations?.length || 0,
        locations: locations?.length || 0,
        loadingState: parentLoading
      });
      
      // Fetch upcoming meetings
      fetchUpcomingMeetings();
    }
  }, [dashboardStats, departments, users, events, designations, locations]);

  useEffect(() => {
    console.log("AdminDashboard component mounted");
    
    const fetchCompanyData = async () => {
      try {
        // Only fetch company details now since data is passed via props
        const userData = await authService.getCurrentUser();
        if (userData?.company?.id) {
          try {
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/${userData.company.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const companyData = await response.json();
              setDashboardData(prev => ({
                ...prev,
                company: {
                  ...prev.company,
                  name: companyData.name || 'Your Company',
                  logoUrl: companyData.logoUrl || '',
                  projectName: companyData.projectName || companyData.project_name || '',
                  projectLogo: companyData.projectLogo || companyData.project_logo || '',
                  domain: companyData.domain || '',
                  industry: companyData.industry || '',
                  size: companyData.size || ''
                }
              }));
            }
          } catch (error) {
            console.error('Error fetching company data:', error);
          }
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    };
    
    fetchCompanyData();
    
    return () => {
      console.log("AdminDashboard component unmounting");
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Show a simple loading view
  if (loading) {
    return (
      <div className="admin-dashboard" style={{padding: '2rem'}}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '5rem',
          flexDirection: 'column'
        }}>
          <div style={{ 
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid #e5e7eb',
            borderTopColor: '#4f46e5',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading dashboard data...</p>
        </div>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="admin-dashboard" style={{padding: '2rem'}}>
        <div className="alert alert-error" style={{ 
          padding: '1rem',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          borderRadius: '8px',
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{marginTop: 0}}>Error Loading Dashboard</h3>
          <p>{error}</p>
          <div style={{marginTop: '1rem'}}>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '0.75rem'
              }}
            >
              Reload Page
            </button>
            <button 
              onClick={() => navigate('/company-admin')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
        
        {/* Debug toggle */}
        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={() => setShowDebugData(!showDebugData)}
            style={{
              padding: '0.5rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showDebugData ? 'Hide' : 'Show'} Debug Data
          </button>
          
          {showDebugData && rawResponseData && (
            <div style={{ 
              marginTop: '1rem',
              padding: '1rem',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              <pre>{JSON.stringify(rawResponseData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="admin-dashboard" style={{padding: '1.5rem'}}>
      {/* Removed title section as requested */}
      
      {/* Debug toggle button repositioned */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
        <button
          onClick={() => setShowDebugData(!showDebugData)}
          style={{
            padding: '0.25rem 0.5rem',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
        >
          {showDebugData ? 'Hide' : 'Show'} Debug Info
        </button>
        
        {showDebugData && (
          <div style={{ 
            position: 'absolute',
            right: 0,
            top: '100%',
            width: '300px',
            padding: '0.75rem',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '0.75rem',
            overflow: 'auto',
            maxHeight: '200px',
            zIndex: 100
          }}>
            <pre>{JSON.stringify(rawResponseData || {}, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Company Information Card - Improved layout */}
      <div className="company-info-card" style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column', // changed to column for center alignment
        alignItems: 'center',    // center horizontally
        gap: '1.5rem'
      }}>
        {/* Project Logo & Name */}
        {dashboardData.company.projectLogo || dashboardData.company.projectName ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {dashboardData.company.projectLogo ? (
              <img
                src={`${env.apiHost}${dashboardData.company.projectLogo}`}
                alt={dashboardData.company.projectName || 'Project Logo'}
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid #f3f4f6',
                  flexShrink: 0
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<div style=\"width: 80px; height: 80px; display: flex; align-items: center; justifyContent: center; background-color: #4f46e5; color: white; border-radius: 8px; font-size: 2rem; font-weight: bold;\">${dashboardData.company.projectName ? dashboardData.company.projectName.charAt(0).toUpperCase() : 'P'}</div>`;
                }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#4f46e5',
                color: 'white',
                borderRadius: '8px',
                fontSize: '2rem',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                {dashboardData.company.projectName ? dashboardData.company.projectName.charAt(0).toUpperCase() : 'P'}
              </div>
            )}
            {dashboardData.company.projectName && (
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                textAlign: 'center',
                color: '#374151'
              }}>
                {dashboardData.company.projectName}
              </span>
            )}
          </div>
        ) : null}
      </div>
    
      {/* Statistics Cards - Improved layout and alignment */}
      <div className="stats-cards" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Users Card */}
        <div className="stat-card" style={{
          background: 'linear-gradient(to right, #4f46e5, #6366f1)',
          borderRadius: '8px',
          padding: '1.5rem',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)',
          alignItems: 'center' // center content horizontally
        }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.9, textAlign: 'center' }}>Total Users</span>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            margin: '0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center', // center the number
            width: '100%',
            textAlign: 'center'
          }}>
            <span>{dashboardData.stats.users.total}</span>
          </div>
          <div style={{ marginTop: 'auto', fontSize: '0.875rem', textAlign: 'center' }}>
            <span style={{ marginRight: '1rem' }}>
              <span style={{ opacity: 0.8 }}>Admins: </span>
              <strong>{dashboardData.stats.users.company_admin}</strong>
            </span>
            <span style={{ marginRight: '1rem' }}>
              <span style={{ opacity: 0.8 }}>HODs: </span>
              <strong>{dashboardData.stats.users.hod}</strong>
            </span>
            <span>
              <span style={{ opacity: 0.8 }}>Users: </span>
              <strong>{dashboardData.stats.users.user}</strong>
            </span>
          </div>
        </div>

        {/* Departments Card */}
        <div className="stat-card" style={{
          background: 'linear-gradient(to right, #0ea5e9, #38bdf8)',
          borderRadius: '8px',
          padding: '1.5rem',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(14, 165, 233, 0.2)',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.9, textAlign: 'center' }}>Total Departments</span>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            margin: '0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            width: '100%',
            textAlign: 'center'
          }}>
            <span>{dashboardData.stats.departments}</span>
          </div>
          <div style={{ marginTop: 'auto', fontSize: '0.875rem', textAlign: 'center' }}>
            <button 
              onClick={() => navigate('/company-admin/department-management')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              View Departments
            </button>
          </div>
        </div>

        {/* Locations Card */}
        <div className="stat-card" style={{
          background: 'linear-gradient(to right, #ef4444, #f87171)',
          borderRadius: '8px',
          padding: '1.5rem',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.9, textAlign: 'center' }}>Total Locations</span>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            margin: '0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            width: '100%',
            textAlign: 'center'
          }}>
            <span>{dashboardData.stats.locations}</span>
          </div>
          <div style={{ marginTop: 'auto', fontSize: '0.875rem', textAlign: 'center' }}>
            <button 
              onClick={() => navigate('/company-admin/location-management')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              View Locations
            </button>
          </div>
        </div>

        {/* Designations Card */}
        <div className="stat-card" style={{
          background: 'linear-gradient(to right, #8b5cf6, #a78bfa)',
          borderRadius: '8px',
          padding: '1.5rem',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.9, textAlign: 'center' }}>Total Designations</span>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            margin: '0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            width: '100%',
            textAlign: 'center'
          }}>
            <span>{dashboardData.stats.designations}</span>
          </div>
          <div style={{ marginTop: 'auto', fontSize: '0.875rem', textAlign: 'center' }}>
            <button 
              onClick={() => navigate('/company-admin/designation-management')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              View Designations
            </button>
          </div>
        </div>

        {/* Events Card */}
        <div className="stat-card" style={{
          background: 'linear-gradient(to right, #10b981, #34d399)',
          borderRadius: '8px',
          padding: '1.5rem',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.9, textAlign: 'center' }}>Total Events</span>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            margin: '0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            width: '100%',
            textAlign: 'center'
          }}>
            <span>{dashboardData.stats.events.total}</span>
          </div>
          <div style={{ marginTop: 'auto', fontSize: '0.875rem', textAlign: 'center' }}>
            <span style={{ marginRight: '1rem' }}>
              <span style={{ opacity: 0.8 }}>Approved: </span>
              <strong>{dashboardData.stats.events.approved}</strong>
            </span>
            <span>
              <span style={{ opacity: 0.8 }}>Pending: </span>
              <strong>{dashboardData.stats.events.pending}</strong>
            </span>
          </div>
        </div>

        {/* RACI Matrix Card */}
        <div className="stat-card" style={{
          background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
          borderRadius: '8px',
          padding: '1.5rem',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.9, textAlign: 'center' }}>RACI Matrix</span>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            margin: '0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            width: '100%',
            textAlign: 'center'
          }}>
            <span>{dashboardData.stats.events.total}</span>
          </div>
          <div style={{ marginTop: 'auto', fontSize: '0.875rem', textAlign: 'center' }}>
            <span style={{ marginRight: '1rem' }}>
              <span style={{ opacity: 0.8 }}>Approved: </span>
              <strong>{dashboardData.stats.events.approved}</strong>
            </span>
            <span>
              <span style={{ opacity: 0.8 }}>Pending: </span>
              <strong>{dashboardData.stats.events.pending}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Recent Events Section - Improved formatting */}
      <div className="card" style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Recent Events</h2>
          {/* <button
            onClick={() => navigate('/company-admin/event-master')}
            style={{
              background: '#4f46e5',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Create New Event
          </button> */}
        </div>

        <div style={{ padding: '0.5rem' }}>
          {dashboardData.recentEvents && dashboardData.recentEvents.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500', borderBottom: '2px solid #f3f4f6' }}>Event</th>
                    <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500', borderBottom: '2px solid #f3f4f6' }}>Department</th>
                    <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500', borderBottom: '2px solid #f3f4f6' }}>Created On</th>
                    <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500', borderBottom: '2px solid #f3f4f6' }}>Modified On</th>
                    <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500', borderBottom: '2px solid #f3f4f6' }}>Approved On</th>
                    <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500', borderBottom: '2px solid #f3f4f6' }}>Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentEvents.map(event => (
                    <tr key={event.id}>
                      <td style={{ 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #f3f4f6', 
                        fontWeight: '500',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {event.name}
                      </td>
                      <td style={{ 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #f3f4f6',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {/* Handle different department data formats */}
                        {typeof event.department === 'object' 
                          ? event.department?.name 
                          : event.department || 'N/A'}
                      </td>
                      <td style={{ 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #f3f4f6',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {formatDate(event.createdAt)}
                      </td>
                      <td style={{ 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #f3f4f6',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {(() => {
                          // Show the actual modification date with proper timestamp
                          const modifiedDate = event.updatedAt || event.modifiedAt || event.lastModified;
                          if (modifiedDate && modifiedDate !== event.createdAt) {
                            return formatDateTime(modifiedDate);
                          }
                          // If no modification or same as created, show dash
                          return '-';
                        })()}
                      </td>
                      <td style={{ 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #f3f4f6',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {(() => {
                          // Show approved timestamp with proper format
                          const approvedDate = event.approvedAt || event.approvedOn || event.approvalDate;
                          if (approvedDate) {
                            return formatDateTime(approvedDate);
                          }
                          // Check if event is approved but no specific timestamp
                          if (event.status === 'approved') {
                            return 'Approved';
                          }
                          return '-';
                        })()}
                      </td>
                      <td style={{ 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #f3f4f6',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {(() => {
                          // Show HOD as approver
                          if (event.status === 'approved') {
                            // Try to get HOD from event data
                            const hod = event.hod || event.approver || event.approvedBy;
                            if (hod) {
                              if (typeof hod === 'string') {
                                // If it's a comma-separated list of HOD IDs, show "HOD"
                                if (hod.includes(',')) {
                                  return 'HODs';
                                }
                                return hod;
                              }
                              if (hod.name) return hod.name;
                              if (hod.email) return hod.email;
                            }
                            // Try to get HOD from department
                            if (event.department && event.department.hod) {
                              const deptHod = event.department.hod;
                              if (typeof deptHod === 'string') return deptHod;
                              return deptHod.name || deptHod.email || 'HOD';
                            }
                            return 'HOD';
                          }
                          return '-';
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7280' }}>
              <p>No recent events found</p>
              <button 
                onClick={() => navigate('/company-admin/event-master')}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Create Event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Meetings Section */}
      <div className="card" style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Upcoming Meetings</h2>
            <button
              onClick={() => navigate('/company-admin/meeting-calendar')}
              style={{
                background: '#10b981',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              View Calendar
            </button>
          </div>
          
          {/* Meeting Filters */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            background: '#f8f9fa',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#495057' }}>Status:</label>
              <select
                value={meetingFilters.statusFilter}
                onChange={(e) => setMeetingFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  background: 'white'
                }}
              >
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="all">All</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#495057' }}>From:</label>
              <input
                type="date"
                value={meetingFilters.dateRange.startDate}
                onChange={(e) => setMeetingFilters(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, startDate: e.target.value }
                }))}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#495057' }}>To:</label>
              <input
                type="date"
                value={meetingFilters.dateRange.endDate}
                onChange={(e) => setMeetingFilters(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, endDate: e.target.value }
                }))}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#495057' }}>Event:</label>
              <input
                type="text"
                placeholder="Filter by event..."
                value={meetingFilters.eventFilter}
                onChange={(e) => setMeetingFilters(prev => ({ ...prev, eventFilter: e.target.value }))}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  width: '150px'
                }}
              />
            </div>
            
            <button
              onClick={fetchUpcomingMeetings}
              disabled={meetingsLoading}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.375rem 1rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {meetingsLoading ? 'Loading...' : 'Apply Filter'}
            </button>
            
            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
              Found: {dashboardData.upcomingMeetings.length} meeting{dashboardData.upcomingMeetings.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div style={{ padding: '0.5rem' }}>
          {meetingsLoading ? (
            <div style={{ 
              padding: '2rem 0', 
              textAlign: 'center', 
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <div style={{ 
                width: '20px',
                height: '20px',
                border: '2px solid #e5e7eb',
                borderTopColor: '#10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>Loading meetings...</span>
            </div>
          ) : dashboardData.upcomingMeetings && dashboardData.upcomingMeetings.length > 0 ? (
            <div style={{ padding: '1rem' }}>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem'
              }}>
                {dashboardData.upcomingMeetings.map(meeting => (
                  <div 
                    key={meeting.id}
                    onClick={() => navigate('/company-admin/meeting-calendar')}
                    style={{
                      padding: '1.25rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '1.1rem',
                      color: '#1f2937',
                      lineHeight: '1.3'
                    }}>
                      {meeting.title || meeting.name || meeting.subject || 'Untitled Meeting'}
                    </div>
                    
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>📅</span>
                        <span style={{ 
                          fontSize: '0.9rem',
                          color: '#4b5563',
                          fontWeight: '500'
                        }}>
                          {(() => {
                            const meetingDate = meeting.date || meeting.scheduledAt || meeting.startTime || meeting.meetingDate;
                            if (!meetingDate) return 'Date not set';
                            try {
                              return new Date(meetingDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              });
                            } catch (error) {
                              return 'Invalid date';
                            }
                          })()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>⏰</span>
                        <span style={{ 
                          fontSize: '0.9rem',
                          color: '#4b5563',
                          fontWeight: '500'
                        }}>
                          {(() => {
                            // Try multiple field names for time
                            const timeValue = meeting.time || meeting.startTime || meeting.scheduledTime || meeting.meetingTime;
                            
                            // If no time value found, try to extract from date fields
                            if (!timeValue) {
                              const dateValue = meeting.date || meeting.scheduledAt || meeting.startTime || meeting.meetingDate;
                              if (dateValue) {
                                try {
                                  const date = new Date(dateValue);
                                  // Only show time if it's not midnight (meaning it actually has time info)
                                  if (date.getHours() !== 0 || date.getMinutes() !== 0) {
                                    return date.toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                  }
                                } catch (error) {
                                  // Continue to show "Time not set"
                                }
                              }
                              return 'Time not set';
                            }
                            
                            // If it's already formatted time (like "09:00 AM" or "9:00 AM"), return as is
                            if (typeof timeValue === 'string' && (timeValue.includes('AM') || timeValue.includes('PM'))) {
                              return timeValue;
                            }
                            
                            // If it's a time string like "09:00" or "9:00", format it to 12-hour format
                            if (typeof timeValue === 'string' && timeValue.includes(':')) {
                              const [hours, minutes] = timeValue.split(':');
                              const hour = parseInt(hours);
                              if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
                              }
                            }
                            
                            // If it's a date object or date string, extract time
                            try {
                              const date = new Date(timeValue);
                              if (!isNaN(date.getTime())) {
                                return date.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              }
                            } catch (error) {
                              console.log('Error parsing time:', error);
                            }
                            
                            // Fallback: return the raw value if it exists
                            return timeValue ? timeValue.toString() : 'Time not set';
                          })()}
                        </span>
                      </div>
                    </div>
                    
                    {(meeting.organizer || meeting.organizedBy || meeting.createdBy) && (
                      <div style={{ 
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid #f3f4f6'
                      }}>
                        <strong>Organizer:</strong> {meeting.organizer || meeting.organizedBy || meeting.createdBy}
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      marginTop: 'auto'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#10b981',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        Click to view calendar
                        <span style={{ fontSize: '0.9rem' }}>→</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
              <p style={{ marginBottom: '1rem' }}>No upcoming meetings scheduled</p>
              <button 
                onClick={() => navigate('/company-admin/meeting-calendar')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Schedule Meeting
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions Section - Improved formatting */}
      {/* <div className="card" style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Quick Actions</h2>
        </div>
        
        <div style={{ 
          padding: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem' 
        }}>
          <button
            onClick={() => navigate('/company-admin/user-creation')}
            style={{
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            <span style={{ fontSize: '1.5rem' }}>👤</span>
            <span style={{ fontWeight: '500' }}>Add New User</span>
          </button>
          
          <button
            onClick={() => navigate('/company-admin/department-management')}
            style={{
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            <span style={{ fontSize: '1.5rem' }}>🏢</span>
            <span style={{ fontWeight: '500' }}>Manage Departments</span>
          </button>
          
          <button
            onClick={() => navigate('/company-admin/event-master')}
            style={{
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            <span style={{ fontSize: '1.5rem' }}>📝</span>
            <span style={{ fontWeight: '500' }}>Create Event</span>
          </button>
          
          <button
            onClick={() => navigate('/company-admin/raci-assignment')}
            style={{
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            <span style={{ fontSize: '1.5rem' }}>📊</span>
                            <span style={{ fontWeight: '500' }}>RACI Operations</span>
          </button>
        </div>
      </div> */}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .stats-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;