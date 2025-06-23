// Creating new component EventApprovals to list pending events for HOD with approve/reject functionality.
import React, { useEffect, useState } from 'react';
import env from '../../src/config/env';

const EventApprovals = ({ userData }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch events on mount or when user changes
  useEffect(() => {
    if (!userData || !userData.id) return;
    fetchPendingEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.id]);

  // Helper: fetch all events then filter for current HOD + pending status
  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('raci_auth_token');
      const resp = await fetch(`${env.apiBaseUrl}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();

      let list = [];
      if (Array.isArray(data)) list = data;
      else if (data && Array.isArray(data.events)) list = data.events;
      else if (data && data.data && Array.isArray(data.data)) list = data.data;

      // Match by id or nested hod.id (some APIs might return hod as string or object)
      const pending = list.filter(e => {
        const hodId = e.hod && typeof e.hod === 'object' ? e.hod.id : e.hod;
        return hodId === userData.id && e.status === 'pending';
      });

      setEvents(pending);
    } catch (err) {
      console.error('Failed to load pending approvals', err);
      setError('Unable to load pending approvals, please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Approve event handler
  const handleApprove = async (eventId) => {
    if (!window.confirm('Are you sure you want to approve this event?')) return;
    try {
      const token = localStorage.getItem('raci_auth_token');
      const resp = await fetch(`${env.apiBaseUrl}/events/${eventId}/approve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ status: 'approved' })
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      console.error('Approval failed', err);
      alert('Could not approve event. Please try again.');
    }
  };

  // Reject event handler
  const handleReject = async (eventId) => {
    const comment = window.prompt('Enter rejection comments (optional):', '');
    if (comment === null) return; // Cancelled
    try {
      const token = localStorage.getItem('raci_auth_token');
      const resp = await fetch(`${env.apiBaseUrl}/events/${eventId}/reject`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ status: 'rejected', comment })
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      console.error('Rejection failed', err);
      alert('Could not reject event. Please try again.');
    }
  };

  // Render table of pending events
  const renderTable = () => {
    if (loading) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading pending approvals...</div>
    );
    if (error) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>{error}</div>
    );
    if (events.length === 0) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No events awaiting your approval.</div>
    );

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Event Name</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Department</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Created On</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(evt => (
              <tr key={evt.id}>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{evt.name}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{evt.department?.name || 'N/A'}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{new Date(evt.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{evt.description || '-'}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <button onClick={() => handleApprove(evt.id)} style={{ marginRight: '0.5rem', padding: '0.5rem 0.75rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => handleReject(evt.id)} style={{ padding: '0.5rem 0.75rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-header" style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem' }}>
        <h2 style={{ margin: 0 }}>Pending Event Approvals</h2>
      </div>
      <div className="card-body" style={{ padding: '1rem' }}>
        {renderTable()}
      </div>
    </div>
  );
};

export default EventApprovals; 