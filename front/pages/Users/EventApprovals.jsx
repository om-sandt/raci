// Creating new component EventApprovals to list pending events for HOD with approve/reject functionality.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import env from '../../src/config/env';
import eventService from '../../src/services/event.service';

const EventApprovals = ({ userData }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add state for history functionality
  const [activeTab, setActiveTab] = useState('pending');
  const [historyEvents, setHistoryEvents] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleBackToDashboard = () => {
    navigate('/user/raci-dashboard');
  };

  // Fetch events on mount or when user changes
  useEffect(() => {
    console.log('EventApprovals: useEffect triggered with userData:', userData);
    if (!userData || !userData.id) {
      console.log('EventApprovals: No userData or userData.id, returning early');
      return;
    }
    console.log('EventApprovals: Starting to fetch events for user ID:', userData.id);
    fetchPendingEvents();
    fetchHistoricalEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.id]);

  /*
   * Fetch events with status=pending, then retrieve full details for each to
   * determine if the logged-in HOD is the approver. This is necessary because
   * the base list endpoint does not include `hod_id`.
   */
  const fetchPendingEvents = async () => {
    try {
      console.log('EventApprovals: Starting fetchPendingEvents');
      setLoading(true);
      const token = localStorage.getItem('raci_auth_token');

      // Step 1: fetch all events first to see what's available
      console.log('EventApprovals: Fetching all events first to check available data');
      const allEventsResp = await fetch(`${env.apiBaseUrl}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      console.log('EventApprovals: All events response status:', allEventsResp.status);
      if (allEventsResp.ok) {
        const allEventsData = await allEventsResp.json();
        console.log('EventApprovals: All events data:', allEventsData);
        
        let allEvents = [];
        if (Array.isArray(allEventsData)) allEvents = allEventsData;
        else if (allEventsData && Array.isArray(allEventsData.events)) allEvents = allEventsData.events;
        
        console.log('EventApprovals: All events list:', allEvents.map(e => ({ id: e.id, name: e.name, status: e.status, hod: e.hod })));
      }

      // Step 2: try different status values
      const statusValues = ['pending', 'PENDING', 'PENDING_APPROVAL', 'not_started'];
      let list = [];
      
      for (const status of statusValues) {
        console.log(`EventApprovals: Trying status: ${status}`);
        try {
          const listResp = await fetch(`${env.apiBaseUrl}/events?status=${status}&limit=1000`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            }
          });
          console.log(`EventApprovals: ${status} events response status:`, listResp.status);
          if (listResp.ok) {
            const listData = await listResp.json();
            console.log(`EventApprovals: ${status} events data:`, listData);
            
            if (Array.isArray(listData)) list = listData;
            else if (listData && Array.isArray(listData.events)) list = listData.events;
            
            if (list.length > 0) {
              console.log(`EventApprovals: Found ${list.length} events with status ${status}`);
              break;
            }
          }
        } catch (err) {
          console.log(`EventApprovals: Error fetching ${status} events:`, err);
        }
      }
      
      console.log('EventApprovals: Final events list to process:', list);

      // If no events found with status filtering, try fetching all events and filtering client-side
      if (list.length === 0) {
        console.log('EventApprovals: No events found with status filtering, trying to fetch all events');
        try {
          const allEventsResp = await fetch(`${env.apiBaseUrl}/events`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            }
          });
          if (allEventsResp.ok) {
            const allEventsData = await allEventsResp.json();
            let allEvents = [];
            if (Array.isArray(allEventsData)) allEvents = allEventsData;
            else if (allEventsData && Array.isArray(allEventsData.events)) allEvents = allEventsData.events;
            
            // Filter for pending events client-side
            const pendingEvents = allEvents.filter(e => 
              ['pending', 'PENDING', 'PENDING_APPROVAL', 'not_started'].includes(e.status?.toLowerCase())
            );
            console.log('EventApprovals: Found pending events client-side:', pendingEvents);
            list = pendingEvents;
          }
        } catch (err) {
          console.log('EventApprovals: Error fetching all events:', err);
        }
      }

      // Step 2: for each event, fetch full details in parallel (to get hod_id)
      const detailedResults = await Promise.all(
        list.map(async (evt) => {
          try {
            const detailResp = await fetch(`${env.apiBaseUrl}/events/${evt.id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
              }
            });
            if (!detailResp.ok) throw new Error(`detail ${detailResp.status}`);
            return await detailResp.json();
          } catch (err) {
            console.error('Failed to load event details', err);
            return null;
          }
        })
      );

      console.log('EventApprovals: Detailed results:', detailedResults);
      
      const pendingForHod = detailedResults.filter(e => {
        if (!e) return false;
        // Check for various pending status values
        const isPending = ['pending', 'PENDING', 'PENDING_APPROVAL', 'not_started'].includes(e.status?.toLowerCase());
        if (!isPending) return false;
        const hodRef = e.hod && e.hod.id ? e.hod.id : (typeof e.hod === 'number' ? e.hod : null);
        console.log('EventApprovals: Checking event', e.id, 'status:', e.status, 'hodRef:', hodRef, 'userData.id:', userData.id, 'match:', hodRef === userData.id);
        return hodRef === userData.id;
      });

      console.log('EventApprovals: Filtered pending events for HOD:', pendingForHod);
      setEvents(pendingForHod);
    } catch (err) {
      console.error('Failed to load pending approvals', err);
      setError('Unable to load pending approvals, please try again later.');
    } finally {
      setLoading(false);
    }
  };

  /*
   * Fetch historical events (approved and rejected) that were processed by this HOD
   */
  const fetchHistoricalEvents = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const token = localStorage.getItem('raci_auth_token');

      // Fetch approved events
      const approvedResp = await fetch(`${env.apiBaseUrl}/events?status=approved&limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });

      // Fetch rejected events  
      const rejectedResp = await fetch(`${env.apiBaseUrl}/events?status=rejected&limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });

      let approvedEvents = [];
      let rejectedEvents = [];

      if (approvedResp.ok) {
        const approvedData = await approvedResp.json();
        if (Array.isArray(approvedData)) approvedEvents = approvedData;
        else if (approvedData && Array.isArray(approvedData.events)) approvedEvents = approvedData.events;
      }

      if (rejectedResp.ok) {
        const rejectedData = await rejectedResp.json();
        if (Array.isArray(rejectedData)) rejectedEvents = rejectedData;
        else if (rejectedData && Array.isArray(rejectedData.events)) rejectedEvents = rejectedData.events;
      }

      // Combine approved and rejected events
      const allHistoricalEvents = [...approvedEvents, ...rejectedEvents];

      // Get detailed information for each historical event to check if this HOD was the approver
      const detailedHistoricalResults = await Promise.all(
        allHistoricalEvents.map(async (evt) => {
          try {
            const detailResp = await fetch(`${env.apiBaseUrl}/events/${evt.id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
              }
            });
            if (!detailResp.ok) return null;
            return await detailResp.json();
          } catch (err) {
            console.error('Failed to load historical event details', err);
            return null;
          }
        })
      );

      // Filter events that were approved/rejected by this HOD
      const hodHistoricalEvents = detailedHistoricalResults.filter(e => {
        if (!e) return false;
        if (!['approved', 'rejected'].includes(e.status)) return false;
        const hodRef = e.hod && e.hod.id ? e.hod.id : (typeof e.hod === 'number' ? e.hod : null);
        return hodRef === userData.id;
      });

      // Sort by updatedAt or createdAt (most recent first)
      hodHistoricalEvents.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt);
        const dateB = new Date(b.updatedAt || b.createdAt);
        return dateB - dateA;
      });

      setHistoryEvents(hodHistoricalEvents);
    } catch (err) {
      console.error('Failed to load approval history', err);
      setHistoryError('Unable to load approval history, please try again later.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Approve event handler
  const handleApprove = async (eventId) => {
    if (!window.confirm('Are you sure you want to approve this event?')) return;
    try {
      const response = await eventService.approveEvent(eventId, true, '');
      console.log('Approval response:', response);
      
      // Remove from pending events
      const approvedEvent = events.find(e => e.id === eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      
      // Add to history immediately with approved status
      if (approvedEvent) {
        const updatedEvent = {
          ...approvedEvent,
          status: 'approved',
          updatedAt: new Date().toISOString(),
          comments: 'Approved by HOD'
        };
        setHistoryEvents(prev => [updatedEvent, ...prev]);
      }
      
      // Also refresh history from server to ensure consistency
      setTimeout(() => {
        fetchHistoricalEvents();
      }, 1000);
      
      // Show success message
      setSuccessMessage('Event approved successfully! Check the History tab to view the approved event.');
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (err) {
      console.error('Approval failed', err);
      alert('Could not approve event. Please try again.');
    }
  };

  /* ---------- Reject flow with modal ---------- */
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectEventId, setRejectEventId] = useState(null);

  const openRejectModal = (eventId) => {
    setRejectEventId(eventId);
    setRejectComment('');
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (rejectEventId == null) return;
    try {
      const response = await eventService.approveEvent(rejectEventId, false, rejectComment.trim() || '');
      console.log('Rejection response:', response);
      
      // Remove from pending events
      const rejectedEvent = events.find(e => e.id === rejectEventId);
      setEvents(prev => prev.filter(e => e.id !== rejectEventId));
      setShowRejectModal(false);
      
      // Add to history immediately with rejected status
      if (rejectedEvent) {
        const updatedEvent = {
          ...rejectedEvent,
          status: 'rejected',
          updatedAt: new Date().toISOString(),
          rejectionReason: rejectComment.trim() || 'Rejected by HOD'
        };
        setHistoryEvents(prev => [updatedEvent, ...prev]);
      }
      
      // Also refresh history from server to ensure consistency
      setTimeout(() => {
        fetchHistoricalEvents();
      }, 1000);
      
      // Show success message
      setSuccessMessage('Event rejected successfully! Check the History tab to view the rejected event.');
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (err) {
      console.error('Rejection failed', err);
      alert('Could not reject event. Please try again.');
    }
  };

  // Render table of historical events
  const renderHistoryTable = () => {
    if (historyLoading) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading approval history...</div>
    );
    if (historyError) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>{historyError}</div>
    );
    if (historyEvents.length === 0) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No approval history found.</div>
    );

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Event Name</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Department</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Created On</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Processed On</th>
              <th style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {historyEvents.map(evt => (
              <tr key={evt.id}>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{evt.name}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{evt.department?.name || 'N/A'}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{new Date(evt.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  {evt.updatedAt ? new Date(evt.updatedAt).toLocaleDateString() : 'N/A'}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    backgroundColor: evt.status === 'approved' ? '#d1fae5' : '#fecaca',
                    color: evt.status === 'approved' ? '#065f46' : '#dc2626'
                  }}>
                    {evt.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  {evt.comments || evt.rejectionReason || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
                  <button onClick={() => openRejectModal(evt.id)} style={{ padding: '0.5rem 0.75rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header" style={{ position: 'relative', marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>Event Approvals</h1>
        <p style={{ margin: '0.5rem 0 0 0' }}>Manage event approvals and view approval history</p>
      </div>
      
      {/* Success message */}
      {successMessage && (
        <div style={{ 
          padding: '0.75rem 1rem',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          {successMessage}
        </div>
      )}
      
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem' }}>
          <h2 style={{ margin: 0 }}>Event Approvals</h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Manage event approvals and view approval history
          </p>
        </div>
      
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            backgroundColor: activeTab === 'pending' ? '#4f46e5' : 'transparent',
            color: activeTab === 'pending' ? 'white' : '#6b7280',
            fontWeight: activeTab === 'pending' ? '600' : '400',
            cursor: 'pointer',
            borderBottom: activeTab === 'pending' ? '2px solid #4f46e5' : 'none',
            fontSize: '0.875rem'
          }}
        >
          Pending Approvals ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            backgroundColor: activeTab === 'history' ? '#4f46e5' : 'transparent',
            color: activeTab === 'history' ? 'white' : '#6b7280',
            fontWeight: activeTab === 'history' ? '600' : '400',
            cursor: 'pointer',
            borderBottom: activeTab === 'history' ? '2px solid #4f46e5' : 'none',
            fontSize: '0.875rem'
          }}
        >
          Approval History ({historyEvents.length})
        </button>
        <div style={{ flex: 1 }}>
          <button
            onClick={() => {
              if (activeTab === 'pending') {
                fetchPendingEvents();
              } else {
                fetchHistoricalEvents();
              }
            }}
            style={{
              float: 'right',
              margin: '0.75rem 1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#374151'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="card-body" style={{ padding: '1rem' }}>
        {activeTab === 'pending' ? renderTable() : renderHistoryTable()}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 8,
            width: '90%',
            maxWidth: 500,
            padding: 24,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0 }}>Reject Event</h3>
            <p>Please provide a reason for rejecting this event (optional):</p>
            <textarea
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db', marginBottom: 16 }}
              placeholder="Enter reason..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={submitReject} 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#b91c1c', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: 'pointer' 
                }}
              >Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default EventApprovals; 