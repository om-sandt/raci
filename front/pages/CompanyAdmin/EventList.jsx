import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';
import eventService from '../../src/services/event.service';

// Helper to build correct asset URLs (consistent with Dashboard)
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

const EventList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sidebar state to control dropdowns
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: false,
    designations: false,
    locations: false,
    raci: true // expand RACI section by default
  });

  // Toggle handler
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Data state
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState('');

  // Add new state for rejection reason
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [loadingReason, setLoadingReason] = useState(false);

  // Add new state for sidebar collapse
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  // Load user and company data (consistent with Dashboard)
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        // Get current user
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        
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

  // Fetch events list
  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      if (Array.isArray(data)) setEvents(data);
      else if (data && Array.isArray(data.events)) setEvents(data.events);
      else setEvents([]);
    } catch (err) {
      console.error('Failed to load events', err);
      setError('Unable to load events, please try again later.');
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    // Handle navigation state to refresh events list
  useEffect(() => {
    if (location.state?.refresh && !isRefreshing) {
      console.log('EventList received refresh request:', location.state);
      setIsRefreshing(true);
      
      // Clear the navigation state immediately to prevent re-triggering
      navigate('/company-admin/event-list', { replace: true, state: {} });
      
      // Show success message if provided
      if (location.state?.message) {
        // Use setTimeout to ensure alert shows after navigation
        setTimeout(() => {
          alert(location.state.message);
        }, 100);
      }
      
      // Force refresh events list
      const forceRefresh = async () => {
        try {
          console.log('Force refreshing events list...');
          setLoadingEvents(true);
          
          // Simple refresh without problematic headers
          const token = localStorage.getItem('raci_auth_token');
          const response = await fetch(`${env.apiBaseUrl}/events?_t=${Date.now()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            }
          });
          
          if (!response.ok) throw new Error(`API error: ${response.status}`);

          const data = await response.json();
          console.log('Refreshed events data:', data);
          
          if (Array.isArray(data)) {
            setEvents(data);
            console.log('Set events from array:', data.map(e => ({ id: e.id, name: e.name, status: e.status })));
          } else if (data && Array.isArray(data.events)) {
            setEvents(data.events);
            console.log('Set events from data.events:', data.events.map(e => ({ id: e.id, name: e.name, status: e.status })));
          } else {
            setEvents([]);
            console.log('No events found in response');
          }
          
          console.log('Events list updated successfully');
          
          // If we have an updated event ID, check if it's in the list with the correct status and update time
          if (location.state?.updatedEventId) {
            const updatedEvent = (Array.isArray(data) ? data : data.events || [])
              .find(event => event.id === location.state.updatedEventId);
            if (updatedEvent) {
              console.log(`Updated event ${location.state.updatedEventId} found with status:`, updatedEvent.status);
              if (updatedEvent.status !== 'pending') {
                console.warn(`Expected status 'pending' but got '${updatedEvent.status}' for updated event`);
              }
              
              // If backend didn't update the timestamp, force it locally
              if (!updatedEvent.updatedAt || updatedEvent.updatedAt === updatedEvent.createdAt) {
                console.log('Backend did not update timestamp, setting locally');
                const currentTimestamp = new Date().toISOString();
                setEvents(prevEvents => prevEvents.map(event => 
                  event.id === location.state.updatedEventId 
                    ? { 
                        ...event, 
                        updatedAt: currentTimestamp,
                        modifiedAt: currentTimestamp,
                        lastModified: currentTimestamp
                      } 
                    : event
                ));
              }
            } else {
              console.warn(`Updated event ${location.state.updatedEventId} not found in events list`);
            }
          }
        } catch (err) {
          console.error('Failed to force refresh events', err);
          // Fallback to regular fetch
          fetchEvents();
        } finally {
          setLoadingEvents(false);
          setIsRefreshing(false);
        }
      };
      
      forceRefresh();
    }
  }, [location.state?.refresh, navigate, isRefreshing]);

  // Enhanced logo rendering methods (consistent with Dashboard)
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

  // Render project logo (used in header)
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

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/company-admin/dashboard');
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const token = localStorage.getItem('raci_auth_token');
      const resp = await fetch(`${env.apiBaseUrl}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      if (!resp.ok) throw new Error(`Failed (${resp.status})`);
      // Remove locally
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      console.error('Delete failed', err);
      alert('Could not delete event. Please try again.');
    }
  };

  // Add function to handle sending an event for approval directly (without modal)
  const handleSendForApproval = async (eventId) => {
    if (!window.confirm('Are you sure you want to send this event for approval?')) return;

    try {
      const token = localStorage.getItem('raci_auth_token');

      const response = await fetch(`${env.apiBaseUrl}/events/${eventId}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      // Update the event status locally
      setEvents(prev => prev.map(event =>
        event.id === eventId ? { ...event, status: 'pending' } : event
      ));

      alert('Event sent for approval successfully!');
    } catch (err) {
      console.error('Failed to send event for approval', err);
      alert('Failed to send event for approval. Please try again.');
    }
  };

  // Add modal state
  const [showHodModal, setShowHodModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [hodOptions, setHodOptions] = useState([]);
  const [selectedHodId, setSelectedHodId] = useState('');
  const [loadingHods, setLoadingHods] = useState(false);

  // Open modal and get HODs for the department
  const openSendForApprovalModal = async (eventId) => {
    setSelectedEventId(eventId);
    setSelectedHodId('');
    setShowHodModal(true);

    // Find the event and its department
    const event = events.find(e => e.id === eventId);
    if (!event || !event.department || !event.department.id) {
      alert('Cannot find department information for this event');
      setShowHodModal(false);
      return;
    }

    try {
      setLoadingHods(true);
      const departmentId = event.department.id;
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/departments/${departmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      // Filter employees with HOD role
      let hods = [];
      if (data && data.employees) {
        hods = data.employees.filter(emp => emp.role === 'hod');
      }

      // Add department HOD if not already in the list
      if (data && data.hod && !hods.some(h => h.id === data.hod.id)) {
        hods.push(data.hod);
      }

      setHodOptions(hods);
    } catch (err) {
      console.error('Failed to load HODs:', err);
      alert('Could not load HODs. Please try again.');
    } finally {
      setLoadingHods(false);
    }
  };

  // Submit event for approval with selected HOD
  const confirmSendForApproval = async () => {
    if (!selectedHodId) {
      alert('Please select a HOD');
      return;
    }

    try {
      // Find the selected HOD object to get their email (required by API)
      const selectedHod = hodOptions.find(h => h.id === selectedHodId);
      
      if (!selectedHod || !selectedHod.email) {
        throw new Error('Selected HOD email not found');
      }

      // Use the event service to submit for approval
      await eventService.submitEventForApproval(selectedEventId, selectedHod.email);
      
      // Update the event status locally
      setEvents(prev => prev.map(event => 
        event.id === selectedEventId ? { ...event, status: 'pending' } : event
      ));
      
      alert('Event sent for approval successfully!');
      setShowHodModal(false);
    } catch (err) {
      console.error('Failed to send event for approval', err);
      alert('Failed to send event for approval. Please try again.');
    }
  };

  // Modal component for HOD selection
  const renderHodModal = () => {
    if (!showHodModal) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: 8,
          width: '90%',
          maxWidth: 500,
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Send Event for Approval</h3>
          
          <p style={{ marginBottom: 16 }}>
            Please select a HOD to approve this event:
          </p>
          
          {loadingHods ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ 
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '2px solid #e5e7eb',
                borderTopColor: '#6366f1',
                animation: 'spin 1s linear infinite',
                marginRight: 8
              }}></div>
              <span>Loading HODs...</span>
            </div>
          ) : hodOptions.length === 0 ? (
            <div style={{ color: '#b91c1c', marginBottom: 16 }}>
              No HODs found for this department. Please assign a HOD in Department Management first.
            </div>
          ) : (
            <select
              value={selectedHodId}
              onChange={(e) => setSelectedHodId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 4,
                border: '1px solid #d1d5db',
                marginBottom: 16
              }}
            >
              <option value="">Select a HOD</option>
              {hodOptions.map(hod => (
                <option key={hod.id} value={hod.id}>
                  {hod.name} {hod.designation ? `(${hod.designation})` : ''}
                </option>
              ))}
            </select>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={() => setShowHodModal(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                backgroundColor: '#f9fafb',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmSendForApproval}
              disabled={!selectedHodId || loadingHods}
              style={{
                padding: '8px 16px',
                backgroundColor: !selectedHodId || loadingHods ? '#9ca3af' : '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: !selectedHodId || loadingHods ? 'not-allowed' : 'pointer'
              }}
            >
              Send for Approval
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleViewReason = async (eventId) => {
    try {
      setLoadingReason(true);
      const token = localStorage.getItem('raci_auth_token');
      const resp = await fetch(`${env.apiBaseUrl}/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      setReasonText(data.rejectionReason || 'No reason provided');
      setShowReasonModal(true);
    } catch (err) {
      console.error('Failed to load rejection reason', err);
      alert('Could not load rejection reason.');
    } finally {
      setLoadingReason(false);
    }
  };

  const renderReasonModal = () => {
    if (!showReasonModal) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 8,
          width: '90%',
          maxWidth: 500,
          padding: 24,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          <h3 style={{ marginTop: 0 }}>Rejection Reason</h3>
          {loadingReason ? (
            <p>Loading...</p>
          ) : (
            <p style={{ whiteSpace: 'pre-wrap' }}>{reasonText}</p>
          )}
          <button onClick={() => setShowReasonModal(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✖</button>
        </div>
      </div>
    );
  };

  // Update the event status display in the table
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
                {companyData ? companyData.name : 'Company'} Administration
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                Events List
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
            <h1>Events List</h1>
          </div>

          <div className="card" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '1.5rem', padding: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
              <h2>Events</h2>
              <button onClick={fetchEvents} title="Refresh Events" style={{ padding: '0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>
                🔄
              </button>
            </div>

            {loadingEvents ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', color: '#6b7280' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.75rem' }} />
                Loading events...
              </div>
            ) : events.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: 8 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
                <p>No events have been created yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Event Name</th>
                      <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Department</th>
                      <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Created On</th>
                      <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Modified On</th>
                      <th style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Reason</th>
                      <th style={{ textAlign: 'right', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{event.name}</td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{event.department?.name || 'N/A'}</td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: 9999, 
                            background: event.status === 'pending' ? '#fef3c7' : 
                                      event.status === 'approved' ? '#dcfce7' : 
                                      event.status === 'rejected' ? '#fee2e2' :
                                      '#f3f4f6',
                            color: event.status === 'pending' ? '#92400e' : 
                                   event.status === 'approved' ? '#15803d' :
                                   event.status === 'rejected' ? '#b91c1c' :
                                   '#4b5563',
                            fontSize: '0.75rem' 
                          }}>
                            {event.status === 'not_send_for_approval' || !event.status ? 
                              'Not Sent for Approval' : 
                              event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{new Date(event.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                          {(() => {
                            // Check for various timestamp fields that might indicate modification
                            const modifiedTime = event.updatedAt || event.modifiedAt || event.lastModified;
                            
                            // If modified time exists and is different from created time, show it
                            if (modifiedTime && modifiedTime !== event.createdAt) {
                              return (
                                <div>
                                  <div style={{ fontWeight: '500' }}>
                                    {new Date(modifiedTime).toLocaleDateString()}
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    {new Date(modifiedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              );
                            } else {
                              return <span style={{ color: '#9ca3af' }}>-</span>;
                            }
                          })()}
                        </td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                          {event.status === 'rejected' ? (
                            <button onClick={() => handleViewReason(event.id)} style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>View Reason</button>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => navigate(`/company-admin/events/edit/${event.id}`)} title="Edit" style={{ padding: '0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>✏️</button>
                            {(event.status === 'not_send_for_approval' || !event.status) && (
                              <button onClick={() => openSendForApprovalModal(event.id)} title="Send for Approval" style={{ padding: '0.5rem', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 4, cursor: 'pointer', color: '#1d4ed8' }}>📤</button>
                            )}
                            <button onClick={() => handleDeleteEvent(event.id)} title="Delete" style={{ padding: '0.5rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', color: '#b91c1c' }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Render HOD selection modal */}
      {renderHodModal()}

      {/* Render rejection reason modal */}
      {renderReasonModal()}
    </div>
  );
};

export default EventList;