import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import env from '../../src/config/env';

const EventList = () => {
  const navigate = useNavigate();

  // Sidebar state to control dropdowns
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: false,
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
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState('');

  // Fetch company profile (name + logo)
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const token = localStorage.getItem('raci_auth_token');
        const response = await fetch(`${env.apiBaseUrl}/company/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCompanyData(data);
        }
      } catch (err) {
        console.error('Failed to load company data', err);
      }
    };

    fetchCompanyData();
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

  // Render helpers
  const renderCompanyLogo = () => {
    if (!companyData) return null;
    const raw = companyData.logoUrl || companyData.logo;
    if (raw) {
      const url = raw.startsWith('http') ? raw : `${window.location.protocol}//${window.location.hostname}:5000${raw}`;
      return (
        <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden', marginRight: 10 }}>
          <img
            src={url}
            alt={companyData.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              e.target.parentNode.innerHTML = `<div style=\"width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;\">${companyData.name?.charAt(0) || 'C'}</div>`;
            }}
          />
        </div>
      );
    }
    return (
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, fontWeight: 700 }}>
        {companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}
      </div>
    );
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

  return (
    <div className="dashboard-layout fix-layout">
      {/* Sidebar */}
      <aside className="sidebar">
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
            <NavLink to="/company-admin/user-creation" className="nav-item">User Creation</NavLink>
            <NavLink to="/company-admin/user-management" className="nav-item">User Management</NavLink>
          </div>

          {/* Department Management */}
          <div className="nav-item" onClick={() => toggleSection('departments')}>
            <i className="icon">🏢</i> <span>Department Management</span>
            <i className={`dropdown-icon ${expandedSections.departments ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.departments ? 'open' : ''}`}>
            <NavLink to="/company-admin/department-management" className="nav-item">Departments</NavLink>
            <NavLink to="/company-admin/department-creation" className="nav-item">Create Department</NavLink>
          </div>

          {/* RACI Management */}
          <div className="nav-item active" onClick={() => toggleSection('raci')}>
            <i className="icon">📅</i> <span>RACI Management</span>
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

          <NavLink to="/company-admin/settings" className="nav-item">
            <i className="icon">⚙️</i> Company Settings
          </NavLink>

          <button className="nav-item" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center' }}>
            <i className="icon">🚪</i> Logout
          </button>
        </nav>
      </aside>

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
                      <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Updated On</th>
                      <th style={{ textAlign: 'right', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{event.name}</td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{event.department?.name || 'N/A'}</td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: 9999, background: '#f3f4f6', fontSize: '0.75rem' }}>{event.status?.charAt(0).toUpperCase() + event.status?.slice(1) || 'Pending'}</span>
                        </td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{new Date(event.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{event.updatedAt ? new Date(event.updatedAt).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => navigate(`/company-admin/events/edit/${event.id}`)} title="Edit" style={{ padding: '0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>✏️</button>
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

      {/* Simple styles fix */}
      <style jsx global>{`
        .fix-layout { display: grid; grid-template-columns: 260px 1fr; width: 100%; height: 100vh; overflow: hidden; }
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