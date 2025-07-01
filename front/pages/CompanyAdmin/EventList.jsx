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
    <div className="dashboard-layout fix-layout">
      {/* Sidebar */}
      <aside className="sidebar" style={{ display: sidebarOpen ? 'block' : 'none' }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', padding: 12, height: 64, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {renderCompanyLogo()}
            <span style={{ fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>
              {companyData ? companyData.name : 'Company'}
            </span>
          </div>
        </div>

        <nav>
          <NavLink to="/company-admin/dashboard" className="nav-item">
            <i className="icon">📊</i> Dashboard
          </NavLink>

          {/* User Admin */}
          <div className="nav-item" onClick={() => toggleSection('users')}>
            <i className="icon">👥</i> <span>User Administration</span>
            <i className={`dropdown-icon ${expandedSections.users ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.users ? 'open' : ''}`}>
            <NavLink to="/company-admin/user-creation" className="nav-item">Create User</NavLink>
            <NavLink to="/company-admin/user-management" className="nav-item">Update User</NavLink>
          </div>

          {/* Department Management */}
          <div className="nav-item" onClick={() => toggleSection('departments')}>
            <i className="icon">🏢</i> <span>Department Workspace</span>
            <i className={`dropdown-icon ${expandedSections.departments ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.departments ? 'open' : ''}`}>
            <NavLink to="/company-admin/department-creation" className="nav-item">Create Department</NavLink>
            <NavLink to="/company-admin/department-management" className="nav-item">Department Workspace</NavLink>
          </div>

          {/* Designation Management */}
          <div className="nav-item" onClick={() => toggleSection('designations')}>
            <i className="icon">🏷️</i> <span>Designation Directory</span>
            <i className={`dropdown-icon ${expandedSections.designations ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.designations ? 'open' : ''}`}>
            <NavLink to="/company-admin/designation-creation" className="nav-item">Create Designation</NavLink>
            <NavLink to="/company-admin/designation-management" className="nav-item">Update Designation</NavLink>
          </div>

          {/* Location Management */}
          <div className="nav-item" onClick={() => toggleSection('locations')}>
            <i className="icon">📍</i> <span>Location Center</span>
            <i className={`dropdown-icon ${expandedSections.locations ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.locations ? 'open' : ''}`}>
            <NavLink to="/company-admin/location-creation" className="nav-item">Create Location</NavLink>
            <NavLink to="/company-admin/location-management" className="nav-item">Update Location</NavLink>
          </div>

          {/* RACI Management */}
          <div className="nav-item active" onClick={() => toggleSection('raci')}>
            <i className="icon">📅</i> <span>RACI Operations</span>
            <i className={`dropdown-icon ${expandedSections.raci ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.raci ? 'open' : ''}`}>
            <NavLink to="/company-admin/event-master" className="nav-item">Event Master</NavLink>
            <NavLink to="/company-admin/event-list" className="nav-item active">Event List</NavLink>
            <NavLink to="/company-admin/raci-assignment" className="nav-item">RACI Assignment</NavLink>
            <NavLink to="/company-admin/raci-tracker" className="nav-item">RACI Tracker</NavLink>
          </div>

          <NavLink to="/company-admin/meeting-calendar" className="nav-item">
            <i className="icon">📆</i> Meeting Calendar
          </NavLink>

          <NavLink to="/company-admin/hierarchy" className="nav-item">
            <i className="icon">🏢</i> Hierarchy
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
              alignItems: 'center',
              gap: '0.5rem',
              marginLeft: '0.5rem',
              height: '44px',
              borderRadius: '6px',
              transition: 'background-color 0.2s'
            }}>
            <i className="icon">🚪</i> Logout
          </button>
        </nav>
      </aside>

      {/* Collapse toggle button */}
      <button onClick={toggleSidebar} style={{
        position: 'fixed',
        top: '12px',
        left: sidebarOpen ? '312px' : '12px',
        zIndex: 100,
        background: '#4f46e5',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 8px',
        cursor: 'pointer'
      }}>
        {sidebarOpen ? '⮜' : '⮞'}
      </button>

      {/* Main */}
      <main className="dashboard-content fix-content">
        <header className="dashboard-header">
          <div className="dashboard-title">{companyData ? companyData.name : 'Company'} Administration</div>
          <div className="header-actions" />
        </header>

        <div className="content-wrapper fix-wrapper">
          <div className="page-header">
            <h1>Events List</h1>
          </div>

          <div className="card fix-card">
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

      {/* Simple styles fix */}
      <style jsx="true" global="true">{`
        .fix-layout { display: grid; grid-template-columns: 300px 1fr; width: 100%; height: 100vh; overflow: hidden; }
        .fix-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 0 !important; }
        .fix-wrapper { padding: 1.5rem 2rem 1.5rem 1.5rem !important; width: 100%; box-sizing: border-box; }
        .fix-card { background: white; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 1.5rem; padding: 1.5rem; }
        @keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg); } }
        .dashboard-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
      `}</style>
    </div>
  );
};

export default EventList;