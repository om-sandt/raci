import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import env from '../../src/config/env';
import raciService from '../../src/services/raci.service';

const RACIApprovals = ({ userData }) => {
  const navigate = useNavigate();
  const [raciMatrices, setRaciMatrices] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

  const handleBackToDashboard = () => {
    navigate('/user/raci-dashboard');
  };

  // Fetch RACI matrices on mount or when user changes
  useEffect(() => {
    if (!userData || !userData.id) return;
    fetchPendingRACIMatrices();
    fetchApprovalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.id]);

  /*
   * Fetch RACI matrices with status=pending that need approval from this user
   */
    const fetchPendingRACIMatrices = async () => {
    try {
      setLoading(true);
      console.log('Fetching pending RACI approvals for user:', userData);
      
      // Use the proper RACI approval API endpoint
      const data = await raciService.getPendingRACIApprovals();
      console.log('Received RACI approvals data:', data);
      
      let pendingApprovals = [];
      // Handle the correct API response format according to documentation
      if (data && data.success && data.pendingApprovals) {
        pendingApprovals = data.pendingApprovals;
      } else if (data && Array.isArray(data.pendingApprovals)) {
        pendingApprovals = data.pendingApprovals;
      } else if (Array.isArray(data)) {
        pendingApprovals = data;
      }
      
      // Group pending approvals by event to combine same events into one RACI table
      const eventGroups = {};
      
      for (const pendingItem of pendingApprovals) {
        const eventKey = `${pendingItem.eventId}-${pendingItem.eventName}-${pendingItem.departmentName}`;
        
        if (!eventGroups[eventKey]) {
          eventGroups[eventKey] = {
            eventId: pendingItem.eventId,
            eventName: pendingItem.eventName,
            eventDescription: pendingItem.eventDescription,
            departmentName: pendingItem.departmentName,
            allApprovals: [],
            createdAt: pendingItem.approvals?.[0]?.createdAt || new Date().toISOString()
          };
        }
        
        // Combine all approvals for this event
        if (pendingItem.approvals && Array.isArray(pendingItem.approvals)) {
          eventGroups[eventKey].allApprovals.push(...pendingItem.approvals);
        }
        
        // Use earliest creation date
        if (pendingItem.approvals?.[0]?.createdAt && 
            new Date(pendingItem.approvals[0].createdAt) < new Date(eventGroups[eventKey].createdAt)) {
          eventGroups[eventKey].createdAt = pendingItem.approvals[0].createdAt;
        }
      }
      
      // Format grouped events into matrices
      const formattedMatrices = [];
      
      for (const [eventKey, eventGroup] of Object.entries(eventGroups)) {
        try {
          // Try to fetch detailed RACI matrix for this event
          let raciMatrix = null;
          try {
            raciMatrix = await raciService.getRACIMatrixForApproval(eventGroup.eventId);
            console.log('Detailed RACI matrix for approval:', raciMatrix);
          } catch (matrixError) {
            console.log('Could not fetch detailed matrix, using basic structure:', matrixError);
          }
          
          // Build comprehensive RACI data from all approvals for this event
          let raciData = { tasks: [] };
          if (raciMatrix && raciMatrix.tasks) {
            raciData = raciMatrix;
          } else if (eventGroup.allApprovals && eventGroup.allApprovals.length > 0) {
            // Group all approvals by task to create comprehensive RACI matrix
            const taskMap = {};
            
                         eventGroup.allApprovals.forEach(approval => {
               if (!taskMap[approval.taskName]) {
                 taskMap[approval.taskName] = {
                   id: approval.taskName,
                   name: approval.taskName,
                   description: approval.taskDescription,
                   raci: {
                     responsible: [],
                     accountable: [],
                     consulted: [],
                     informed: []
                   }
                 };
               }
               
               const raciRole = approval.raciType?.toLowerCase() === 'r' ? 'responsible' : 
                               approval.raciType?.toLowerCase() === 'a' ? 'accountable' :
                               approval.raciType?.toLowerCase() === 'c' ? 'consulted' : 'informed';
               
               // Check if user is already added to avoid duplicates
               const existingUser = taskMap[approval.taskName].raci[raciRole].find(
                 user => user.name === approval.assignedUserName
               );
               
               if (!existingUser) {
                 // Extract financial limits from approval data
                 const financialLimits = {};
                 if (approval.financialLimits) {
                   financialLimits.min = approval.financialLimits.min;
                   financialLimits.max = approval.financialLimits.max;
                 } else if (approval.minLimit !== undefined || approval.maxLimit !== undefined) {
                   financialLimits.min = approval.minLimit;
                   financialLimits.max = approval.maxLimit;
                 }
                 
                 taskMap[approval.taskName].raci[raciRole].push({
                   name: approval.assignedUserName,
                   email: approval.assignedUserEmail,
                   designation: approval.assignedUserDesignation || approval.designation,
                   level: approval.raciLevel,
                   financialLimits: Object.keys(financialLimits).length > 0 ? financialLimits : undefined
                 });
               }
             });
            
            raciData.tasks = Object.values(taskMap);
          }
          
          formattedMatrices.push({
            id: eventGroup.eventId,
            eventId: eventGroup.eventId,
            event: {
              name: eventGroup.eventName,
              description: eventGroup.eventDescription,
              department: {
                name: eventGroup.departmentName
              }
            },
            status: 'PENDING_APPROVAL',
            createdAt: eventGroup.createdAt,
            approvals: eventGroup.allApprovals,
            raciData: raciData
          });
        } catch (processingError) {
          console.error('Failed to process pending approval for event:', eventGroup.eventId, processingError);
          // Fallback to basic data if processing fails
          formattedMatrices.push({
            id: eventGroup.eventId,
            eventId: eventGroup.eventId,
            event: {
              name: eventGroup.eventName || 'Unknown Event',
              description: eventGroup.eventDescription || '',
              department: {
                name: eventGroup.departmentName || 'Unknown Department'
              }
            },
            status: 'PENDING_APPROVAL',
            createdAt: eventGroup.createdAt,
            approvals: [],
            raciData: { tasks: [] }
          });
        }
      }

      console.log('Grouped and formatted matrices for display:', formattedMatrices);
      setRaciMatrices(formattedMatrices);
    } catch (err) {
      console.error('Failed to load pending RACI approvals:', err);
      setError('Unable to load pending RACI approvals. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  /*
   * Fetch approval history - previously approved/rejected RACI matrices
   */
  const fetchApprovalHistory = async () => {
    try {
      setHistoryLoading(true);
      console.log('Fetching approval history for user:', userData);
      
      // Use the RACI approval history API endpoint
      const data = await raciService.getRACIApprovalHistory();
      console.log('Received approval history data:', data);
      
      let historyData = [];
      // Handle the correct API response format according to documentation
      if (data && data.success && data.approvalHistory) {
        historyData = data.approvalHistory;
      } else if (data && Array.isArray(data.approvalHistory)) {
        historyData = data.approvalHistory;
      } else if (Array.isArray(data)) {
        historyData = data;
      }
      
      console.log('Processed history data:', historyData);
      
      // Group history data by event to combine same events into one RACI table
      const historyEventGroups = {};
      
      for (const historyItem of historyData) {
        const departmentName = historyItem.department?.name || 'Unknown Department';
        const eventKey = `${historyItem.eventId}-${historyItem.eventName}-${departmentName}`;
        
        if (!historyEventGroups[eventKey]) {
          historyEventGroups[eventKey] = {
            eventId: historyItem.eventId,
            eventName: historyItem.eventName || 'Unknown Event',
            eventDescription: historyItem.eventDescription || '',
            departmentName: departmentName,
            companyName: historyItem.company?.name || 'Unknown Company',
            eventStatus: historyItem.eventStatus,
            allApprovals: [],
            overallStatus: 'UNKNOWN',
            approvedAt: null,
            rejectedAt: null,
            reasons: []
          };
        }
        
        // Combine all approvals for this event with proper structure from API documentation
        if (historyItem.approvals && Array.isArray(historyItem.approvals)) {
          historyItem.approvals.forEach(approval => {
            // Transform approval data to match our internal structure
            const transformedApproval = {
              approvalId: approval.approvalId,
              approvalLevel: approval.approvalLevel,
              status: approval.status,
              reason: approval.reason,
              approvedAt: approval.approvedAt,
              createdAt: approval.createdAt,
              updatedAt: approval.updatedAt,
              
              // Extract RACI assignment info
              raciType: approval.raciAssignment?.type,
              raciLevel: approval.raciAssignment?.level,
              financialLimits: approval.raciAssignment?.financialLimits,
              
              // Extract task info
              taskId: approval.task?.id,
              taskName: approval.task?.name,
              taskDescription: approval.task?.description,
              taskStatus: approval.task?.status,
              
              // Extract assigned user info
              assignedUserId: approval.assignedUser?.id,
              assignedUserName: approval.assignedUser?.name,
              assignedUserEmail: approval.assignedUser?.email,
              assignedUserDesignation: approval.assignedUser?.designation,
              assignedUserRole: approval.assignedUser?.role,
              assignedUserPhone: approval.assignedUser?.phone,
              assignedUserEmployeeId: approval.assignedUser?.employeeId,
              
              // Event context
              eventId: historyItem.eventId,
              eventName: historyItem.eventName,
              departmentName: departmentName
            };
            
            historyEventGroups[eventKey].allApprovals.push(transformedApproval);
            
            // Determine overall status and dates
            if (approval.status === 'APPROVED' || approval.status === 'REJECTED') {
              historyEventGroups[eventKey].overallStatus = approval.status;
              
              if (approval.status === 'APPROVED') {
                historyEventGroups[eventKey].approvedAt = approval.approvedAt || approval.updatedAt;
              } else {
                historyEventGroups[eventKey].rejectedAt = approval.approvedAt || approval.updatedAt;
              }
              
              if (approval.reason && !historyEventGroups[eventKey].reasons.includes(approval.reason)) {
                historyEventGroups[eventKey].reasons.push(approval.reason);
              }
            }
          });
        }
      }
      
      // Format grouped history events
      const formattedHistory = [];
      
      for (const [eventKey, eventGroup] of Object.entries(historyEventGroups)) {
        try {
          // Build comprehensive RACI data from all approvals for this event
          let raciData = { tasks: [] };
          
          if (eventGroup.allApprovals && eventGroup.allApprovals.length > 0) {
            // Group all approvals by task to create comprehensive RACI matrix
            const taskMap = {};
            
                         eventGroup.allApprovals.forEach(approval => {
               if (!taskMap[approval.taskName]) {
                 taskMap[approval.taskName] = {
                   id: approval.taskName,
                   name: approval.taskName,
                   description: approval.taskDescription,
                   raci: {
                     responsible: [],
                     accountable: [],
                     consulted: [],
                     informed: []
                   }
                 };
               }
               
               const raciRole = approval.raciType?.toLowerCase() === 'r' ? 'responsible' : 
                               approval.raciType?.toLowerCase() === 'a' ? 'accountable' :
                               approval.raciType?.toLowerCase() === 'c' ? 'consulted' : 'informed';
               
               // Check if user is already added to avoid duplicates
               const existingUser = taskMap[approval.taskName].raci[raciRole].find(
                 user => user.name === approval.assignedUserName
               );
               
               if (!existingUser) {
                 // Extract financial limits from approval data
                 const financialLimits = {};
                 if (approval.financialLimits) {
                   financialLimits.min = approval.financialLimits.min;
                   financialLimits.max = approval.financialLimits.max;
                 } else if (approval.minLimit !== undefined || approval.maxLimit !== undefined) {
                   financialLimits.min = approval.minLimit;
                   financialLimits.max = approval.maxLimit;
                 }
                 
                 taskMap[approval.taskName].raci[raciRole].push({
                   name: approval.assignedUserName,
                   email: approval.assignedUserEmail,
                   designation: approval.assignedUserDesignation || approval.designation,
                   level: approval.raciLevel,
                   financialLimits: Object.keys(financialLimits).length > 0 ? financialLimits : undefined
                 });
               }
             });
            
            raciData.tasks = Object.values(taskMap);
          }
          
          formattedHistory.push({
            id: eventGroup.eventId,
            eventId: eventGroup.eventId,
            event: {
              name: eventGroup.eventName,
              description: eventGroup.eventDescription,
              department: {
                name: eventGroup.departmentName
              }
            },
            status: eventGroup.overallStatus,
            approvedAt: eventGroup.approvedAt,
            rejectedAt: eventGroup.rejectedAt,
            reason: eventGroup.reasons.join('; '), // Combine multiple reasons
            approvedBy: userData.name,
            raciData: raciData
          });
        } catch (matrixError) {
          console.error('Failed to process history item:', eventGroup.eventId, matrixError);
          // Add basic history item even if processing fails
          formattedHistory.push({
            id: eventGroup.eventId || Date.now(),
            eventId: eventGroup.eventId,
            event: {
              name: eventGroup.eventName,
              description: eventGroup.eventDescription,
              department: {
                name: eventGroup.departmentName
              }
            },
            status: 'UNKNOWN',
            approvedAt: new Date().toISOString(),
            rejectedAt: null,
            reason: '',
            approvedBy: userData.name,
            raciData: { tasks: [] }
          });
        }
      }

      console.log('Grouped and formatted history for display:', formattedHistory);
      setApprovalHistory(formattedHistory);
      
    } catch (err) {
      console.error('Failed to load approval history:', err);
      // Set empty array on error - no sample data
      setApprovalHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Approve RACI matrix handler using proper API
  const handleApprove = async (eventId, comment = '') => {
    if (!window.confirm('Are you sure you want to approve this RACI matrix?')) return;
    
    try {
      console.log('Approving RACI matrix for event:', eventId, 'with comment:', comment);
      
      // Use the proper RACI approval API endpoint
      await raciService.approveRejectRACIMatrix(eventId, {
        action: 'approve',
        reason: comment || ''
      });
      
      // Remove from pending list and refresh history
      setRaciMatrices(prev => prev.filter(matrix => matrix.eventId !== eventId));
      fetchApprovalHistory(); // Refresh history to show the new approval
      alert('RACI matrix approved successfully');
    } catch (err) {
      console.error('RACI matrix approval failed:', err);
      alert('Could not approve RACI matrix. Please try again.');
    }
  };

  /* ---------- Reject flow with modal ---------- */
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectMatrixId, setRejectMatrixId] = useState(null);

  const openRejectModal = (matrixId) => {
    setRejectMatrixId(matrixId);
    setRejectComment('');
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectComment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    if (rejectMatrixId == null) return;
    
    try {
      console.log('Rejecting RACI matrix for event:', rejectMatrixId, 'with reason:', rejectComment.trim());
      
      // Use the proper RACI approval API endpoint
      await raciService.approveRejectRACIMatrix(rejectMatrixId, {
        action: 'reject',
        reason: rejectComment.trim()
      });
      
      setRaciMatrices(prev => prev.filter(matrix => matrix.eventId !== rejectMatrixId));
      fetchApprovalHistory(); // Refresh history to show the new rejection
      setShowRejectModal(false);
      alert('RACI matrix rejected successfully');
    } catch (err) {
      console.error('RACI matrix rejection failed:', err);
      alert('Could not reject RACI matrix. Please try again.');
    }
  };

  /* ---------- Approve with comment modal ---------- */
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [approveMatrixId, setApproveMatrixId] = useState(null);

  const openApproveModal = (matrixId) => {
    setApproveMatrixId(matrixId);
    setApproveComment('');
    setShowApproveModal(true);
  };

  const submitApprove = async () => {
    if (approveMatrixId == null) return;
    await handleApprove(approveMatrixId, approveComment);
    setShowApproveModal(false);
  };

  // Helper function to render user assignments and financial limits - Show ALL users
  const renderUserAssignments = (users, financialLimits) => {
    if (!users || users.length === 0) {
      return <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>None</span>;
    }
    
    // Group users by their financial limits
    const groupedUsers = {};
    users.forEach(user => {
      // Get financial limits from user object or fallback parameter
      const userLimits = user.financialLimits || {};
      const minLimit = userLimits.min ?? (financialLimits?.min ?? 0);
      const maxLimit = userLimits.max ?? (financialLimits?.max ?? 0);
      const limitKey = `${minLimit}-${maxLimit}`;
      
      if (!groupedUsers[limitKey]) {
        groupedUsers[limitKey] = {
          users: [],
          minLimit,
          maxLimit
        };
      }
      groupedUsers[limitKey].users.push(user);
    });
    
    return (
      <div style={{ fontSize: '0.75rem' }}>
        {Object.values(groupedUsers).map((group, groupIndex) => (
          <div key={groupIndex} style={{ 
            marginBottom: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            {/* Show all users in this group with name and position */}
            {group.users.map((user, userIndex) => (
              <div key={userIndex} style={{ 
                marginBottom: userIndex < group.users.length - 1 ? '0.25rem' : '0'
              }}>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#1f2937',
                  fontSize: '0.8rem'
                }}>
                  {user.name || user.assignedUserName || `User ${user.id}`}
                  {(user.designation || user.assignedUserDesignation) && (
                    <span style={{ 
                      fontWeight: '400', 
                      color: '#6b7280',
                      marginLeft: '0.25rem'
                    }}>
                      ({user.designation || user.assignedUserDesignation})
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {/* Show financial limits once for the group */}
            {(group.minLimit > 0 || group.maxLimit > 0) && (
              <div style={{ 
                fontSize: '0.7rem', 
                color: '#059669', 
                fontWeight: '600',
                marginTop: '0.25rem',
                padding: '0.25rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '4px',
                border: '1px solid #bbf7d0'
              }}>
                {group.minLimit > 0 && `Min: ₹${group.minLimit.toLocaleString()}`}
                {group.minLimit > 0 && group.maxLimit > 0 && ' | '}
                {group.maxLimit > 0 && `Max: ₹${group.maxLimit.toLocaleString()}`}
              </div>
            )}
          </div>
        ))}
        
        <div style={{ 
          fontSize: '0.7rem', 
          color: '#4b5563', 
          fontWeight: '600',
          marginTop: '0.25rem',
          textAlign: 'center',
          padding: '0.25rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px'
        }}>
          Total: {users.length} assigned
        </div>
      </div>
    );
  };

  // Render RACI matrix preview with actual user names and financial limits
  const renderRACIPreview = (matrix) => {
    if (!matrix.raciData || !matrix.raciData.tasks) return null;
    
    console.log('Rendering RACI preview for matrix:', matrix);
    
    return (
      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        backgroundColor: '#f9fafb', 
        borderRadius: '4px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#374151' }}>RACI Matrix Preview</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'left', width: '25%' }}>Task</th>
                <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', width: '18.75%' }}>Responsible</th>
                <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', width: '18.75%' }}>Accountable</th>
                <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', width: '18.75%' }}>Consulted</th>
                <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', width: '18.75%' }}>Informed</th>
              </tr>
            </thead>
            <tbody>
              {matrix.raciData.tasks.map((task, index) => (
                <tr key={index} style={{ 
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                }}>
                  <td style={{ padding: '0.5rem', border: '1px solid #d1d5db', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: '500' }}>
                      {task.name || `Task ${task.id}`}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', border: '1px solid #d1d5db', verticalAlign: 'top' }}>
                    {renderUserAssignments(
                      task.raci?.responsible || [],
                      task.financialLimits?.responsible
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', border: '1px solid #d1d5db', verticalAlign: 'top' }}>
                    {renderUserAssignments(
                      task.raci?.accountable || [],
                      task.financialLimits?.accountable
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', border: '1px solid #d1d5db', verticalAlign: 'top' }}>
                    {renderUserAssignments(
                      task.raci?.consulted || [],
                      task.financialLimits?.consulted
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', border: '1px solid #d1d5db', verticalAlign: 'top' }}>
                    {renderUserAssignments(
                      task.raci?.informed || [],
                      task.financialLimits?.informed
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render table of pending RACI matrices
  const renderTable = () => {
    if (loading) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading pending RACI approvals...</div>
    );
    
    if (error) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>{error}</div>
    );
    
    if (raciMatrices.length === 0) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No RACI matrices awaiting your approval.</div>
    );

    return (
      <div style={{ overflowX: 'auto' }}>
        {raciMatrices.map(matrix => (
          <div key={matrix.id} style={{ 
            marginBottom: '2rem', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            backgroundColor: 'white',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827' }}>
                    {matrix.event?.name || 'Unknown Event'}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Event Department: {matrix.event?.department?.name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Submitted: {new Date(matrix.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Status: <span style={{ 
                      backgroundColor: '#fef3c7', 
                      color: '#92400e', 
                      padding: '0.125rem 0.5rem', 
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>Pending Approval</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => openApproveModal(matrix.eventId || matrix.id)} 
                    style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: '#059669', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 4, 
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => openRejectModal(matrix.eventId || matrix.id)} 
                    style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: '#dc2626', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 4, 
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
            {renderRACIPreview(matrix)}
          </div>
        ))}
      </div>
    );
  };

  // Render history table
  const renderHistoryTable = () => {
    if (historyLoading) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading approval history...</div>
    );
    
    if (approvalHistory.length === 0) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No approval history found.</div>
    );

    return (
      <div style={{ overflowX: 'auto' }}>
        {approvalHistory.map(approval => (
          <div key={approval.id} style={{ 
            marginBottom: '2rem', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            backgroundColor: 'white',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827' }}>
                    {approval.event?.name || 'Unknown Event'}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Event Department: {approval.event?.department?.name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {approval.status === 'APPROVED' ? 'Approved' : 'Rejected'} on: {new Date(approval.approvedAt || approval.rejectedAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Status: <span style={{ 
                      backgroundColor: approval.status === 'APPROVED' ? '#dcfce7' : '#fee2e2', 
                      color: approval.status === 'APPROVED' ? '#16a34a' : '#dc2626', 
                      padding: '0.125rem 0.5rem', 
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>{approval.status === 'APPROVED' ? 'Approved' : 'Rejected'}</span>
                  </div>
                  {approval.reason && (
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      <strong>Reason:</strong> {approval.reason}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: approval.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                    color: approval.status === 'APPROVED' ? '#16a34a' : '#dc2626',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {approval.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                  </span>
                </div>
              </div>
            </div>
            {renderRACIPreview(approval)}
          </div>
        ))}
      </div>
    );
  };

  // Handle tab change with data refresh
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'history' && approvalHistory.length === 0 && !historyLoading) {
      console.log('Switching to history tab, refreshing data...');
      fetchApprovalHistory();
    }
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header" style={{ position: 'relative', marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>RACI Approvals</h1>
        <p style={{ margin: '0.5rem 0 0 0' }}>Manage RACI matrix approvals and view approval history</p>
      </div>
      
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem' }}>
          <h2 style={{ margin: 0 }}>RACI Approvals</h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Manage RACI matrix approvals and view approval history
          </p>
        </div>
      
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <button
          onClick={() => handleTabChange('pending')}
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
          Pending Approvals ({raciMatrices.length})
        </button>
        <button
          onClick={() => handleTabChange('history')}
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
          Approval History ({approvalHistory.length})
        </button>
        <div style={{ flex: 1 }}>
          <button
            onClick={() => {
              if (activeTab === 'pending') {
                fetchPendingRACIMatrices();
              } else {
                fetchApprovalHistory();
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

      {/* Approve with comment modal */}
      {showApproveModal && (
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
            <h3 style={{ marginTop: 0 }}>Approve RACI Matrix</h3>
            <p>Add an optional comment for this approval:</p>
            <textarea
              value={approveComment}
              onChange={e => setApproveComment(e.target.value)}
              rows={4}
              style={{ 
                width: '100%', 
                padding: 8, 
                borderRadius: 4, 
                border: '1px solid #d1d5db', 
                marginBottom: 16 
              }}
              placeholder="Optional comment..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => setShowApproveModal(false)} 
                style={{ 
                  padding: '8px 16px', 
                  border: '1px solid #d1d5db', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: 4, 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={submitApprove} 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#059669', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: 'pointer' 
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h3 style={{ marginTop: 0 }}>Reject RACI Matrix</h3>
            <p>Please provide a reason for rejecting this RACI matrix (required):</p>
            <textarea
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
              rows={4}
              style={{ 
                width: '100%', 
                padding: 8, 
                borderRadius: 4, 
                border: '1px solid #d1d5db', 
                marginBottom: 16 
              }}
              placeholder="Enter reason for rejection..."
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => setShowRejectModal(false)} 
                style={{ 
                  padding: '8px 16px', 
                  border: '1px solid #d1d5db', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: 4, 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={submitReject} 
                disabled={!rejectComment.trim()}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: !rejectComment.trim() ? '#e5e7eb' : '#dc2626', 
                  color: !rejectComment.trim() ? '#9ca3af' : 'white', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: !rejectComment.trim() ? 'not-allowed' : 'pointer' 
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default RACIApprovals;
