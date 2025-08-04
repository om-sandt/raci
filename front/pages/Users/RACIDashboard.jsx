import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import env from '../../src/config/env';

const RACIDashboard = () => {
  const navigate = useNavigate();
  const [raciAssignments, setRaciAssignments] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [departmentData, setDepartmentData] = useState(null);

  const handleBackToDashboard = () => {
    navigate('/user/raci-dashboard');
  };
  
  // Fetch user's RACI assignments from the API
  useEffect(() => {
    const fetchUserAssignments = async () => {
      try {
        setLoading(true);
        
        // Get token from local storage
        const token = localStorage.getItem('raci_auth_token');
        
        // Fetch user's RACI assignments using the specified endpoint
        const response = await fetch(`${env.apiBaseUrl}/user-raci/my-assignments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          // If API returns error status, throw an error
          throw new Error(`Failed to fetch assignments: ${response.status}`);
        }
        
        // Parse the JSON response
        const responseData = await response.json();
        console.log('User RACI assignments response:', responseData);
        
        // Check for success status in response
        if (!responseData.success) {
          throw new Error(responseData.message || 'Failed to retrieve RACI assignments');
        }
        
        // Extract the data from the response
        const { user, department, raciAssignments: assignments } = responseData.data;
        
        // Store user and department data
        setUserData(user);
        setDepartmentData(department);
        
        // Process the assignments data
        if (Array.isArray(assignments)) {
          const formattedAssignments = formatAssignmentsFromApi(assignments);
          setRaciAssignments(formattedAssignments);
          
          // Calculate stats based on the formatted assignments
          const calculatedStats = calculateStats(formattedAssignments);
          setStats(calculatedStats);
        } else {
          console.warn('No assignments array found in API response');
          setRaciAssignments([]);
          setStats(generateEmptyStats());
        }
      } catch (error) {
        console.error('Error fetching RACI assignments:', error);
        setError(error.message);
        
        // Set empty arrays in case of error
        setRaciAssignments([]);
        setStats(generateEmptyStats());
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAssignments();
  }, []);
  
  // Generate empty stats for error handling
  const generateEmptyStats = () => {
    return [
      { label: 'Responsible', value: 0, color: '#ef4444' },
      { label: 'Accountable', value: 0, color: '#3b82f6' },
      { label: 'Consulted', value: 0, color: '#f59e0b' },
      { label: 'Informed', value: 0, color: '#10b981' }
    ];
  };
  
  // Format assignments from the API format
  const formatAssignmentsFromApi = (assignments) => {
    return assignments.map(assignment => {
      console.log("Processing assignment with financial limits:", assignment.financialLimits);
      
      return {
        id: assignment.task?.id || `task-${Math.random().toString(36).substring(7)}`,
        event: assignment.event?.name || 'Unnamed Event',
        task: assignment.task?.name || 'Unnamed Task',
        description: assignment.task?.description || '',
        role: mapRoleCodeToName(assignment.role),
        status: assignment.task?.status || 'pending',
        dueDate: formatDueDate(assignment.event?.endDate),
        eventId: assignment.event?.id,
        taskId: assignment.task?.id,
        // Explicitly extract financial limits
        financialLimits: assignment.financialLimits ? {
          min: assignment.financialLimits.min,
          max: assignment.financialLimits.max
        } : null
      };
    });
  };
  
  // Map role code (R, A, C, I) to full role name
  const mapRoleCodeToName = (roleCode) => {
    switch (roleCode?.toUpperCase()) {
      case 'R': return 'Responsible';
      case 'A': return 'Accountable';
      case 'C': return 'Consulted';
      case 'I': return 'Informed';
      default: return roleCode || 'Unknown';
    }
  };
  
  // Format due date to a consistent format
  const formatDueDate = (dateString) => {
    if (!dateString) return 'Not set';
    
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Format the date (e.g., "Oct 15, 2023")
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Calculate statistics from the assignments
  const calculateStats = (assignments) => {
    const roleCounts = {
      responsible: 0,
      accountable: 0,
      consulted: 0,
      informed: 0
    };
    
    // Count the number of assignments for each role
    assignments.forEach(assignment => {
      const role = assignment.role?.toLowerCase() || '';
      if (roleCounts.hasOwnProperty(role)) {
        roleCounts[role]++;
      }
    });
    
    // Create stats array in the format expected by the UI
    return [  
      { label: 'Responsible', value: roleCounts.responsible, color: '#ef4444' },
      { label: 'Accountable', value: roleCounts.accountable, color: '#3b82f6' },
      { label: 'Consulted', value: roleCounts.consulted, color: '#f59e0b' },
      { label: 'Informed', value: roleCounts.informed, color: '#10b981' }
    ];
  };
  
  // Get appropriate status badge based on status value
  const getStatusBadge = (status) => {
    let bgColor, textColor;
    
    switch (status?.toLowerCase()) {
      case 'completed':
        bgColor = '#dcfce7';
        textColor = '#15803d';
        break;
      case 'in_progress':
      case 'in progress':
        bgColor = '#e0f2fe';
        textColor = '#0369a1';
        break;
      case 'pending':
        bgColor = '#fef9c3';
        textColor = '#854d0e';
        break;
      case 'overdue':
        bgColor = '#fee2e2';
        textColor = '#b91c1c';
        break;
      default:
        bgColor = '#f3f4f6';
        textColor = '#4b5563';
    }
    
    const displayStatus = status
      ?.replace(/_/g, ' ')
      ?.split(' ')
      ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
      ?.join(' ') || 'Unknown';
      
    return (
      <span style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: '500'
      }}>
        {displayStatus}
      </span>
    );
  };
  
  // Get appropriate color for role
  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'responsible': return '#ef4444';
      case 'accountable': return '#3b82f6';
      case 'consulted': return '#f59e0b';
      case 'informed': return '#10b981';
      default: return '#6b7280';
    }
  };
  
  // Handler for viewing assignment details
  const handleViewDetails = (assignment) => {
    console.log('Viewing details for assignment:', assignment);
    // Navigate to the detailed view when implemented
    // navigate(`/user/assignments/${assignment.id}`);
    
    // For now just show an alert
    alert(`Viewing details for ${assignment.event}\nTask: ${assignment.task}\nRole: ${assignment.role}`);
  };

  // Function to render financial limits if they exist
  const renderFinancialLimits = (assignment) => {
    if (!assignment.financialLimits) return null;
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        marginTop: '0.5rem',
        padding: '0.5rem',
        backgroundColor: '#f0f9ff',
        borderRadius: '0.25rem',
        fontSize: '0.75rem'
      }}>
        <span style={{ fontWeight: '500', marginBottom: '0.25rem', color: '#0369a1' }}>
          Financial Limits:
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {assignment.financialLimits.min !== undefined && (
            <span>Min: <strong>₹{assignment.financialLimits.min}</strong></span>
          )}
          {assignment.financialLimits.max !== undefined && (
            <span>Max: <strong>₹{assignment.financialLimits.max}</strong></span>
          )}
        </div>
      </div>
    );
  };

  // Enhanced function to render financial limits badge
  const renderFinancialLimitsBadge = (financialLimits) => {
    if (!financialLimits) return null;
    
    return (
      <span style={{
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        padding: '0.125rem 0.375rem',
        borderRadius: '0.25rem',
        fontSize: '0.7rem',
        fontWeight: '500',
        marginLeft: '0.5rem',
        display: 'inline-flex',
        alignItems: 'center',
      }}>
        <span style={{ marginRight: '0.25rem' }}>💰</span>
        {financialLimits.max ? `₹${financialLimits.max}` : 'Limit Set'}
      </span>
    );
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header" style={{ position: 'relative', marginBottom: '2rem' }}>
        <h1 style={{ textAlign: 'center', margin: 0 }}>RACI Dashboard</h1>
        <p style={{ textAlign: 'center', margin: '0.5rem 0 0 0' }}>View and track your RACI assignments</p>
        
        {/* Display user/department information if available */}
        {userData && departmentData && (
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '0.5rem 1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#64748b',
            textAlign: 'center'
          }}>
            <span>{userData.name} • {departmentData.name} Department</span>
          </div>
        )}
      </div>
      
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          padding: '2rem 0' 
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            border: '3px solid #f3f3f3', 
            borderTop: '3px solid #4f46e5', 
            animation: 'spin 1s linear infinite' 
          }}></div>
          <p style={{ marginLeft: '1rem', color: '#4f46e5' }}>Loading your assignments...</p>
        </div>
      ) : error ? (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee2e2', 
          color: '#b91c1c',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <p>Error loading assignments: {error}</p>
          <p>Please refresh the page or try again later.</p>
        </div>
      ) : (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="card" 
                style={{ 
                  margin: 0, 
                  textAlign: 'center',
                  borderTop: `4px solid ${stat.color}`
                }}
              >
                <h3 style={{ fontSize: '2rem', fontWeight: '700', color: stat.color }}>
                  {stat.value}
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          
          <div className="card">
            <div className="card-header">
              <h2>My RACI Assignments</h2>
            </div>
            <div className="table-container">
              {raciAssignments.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Task</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Financial Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {raciAssignments.map(assignment => (
                      <tr key={assignment.id}>
                        <td>{assignment.event}</td>
                        <td>{assignment.task}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: getRoleColor(assignment.role)
                            }}></span>
                            {assignment.role}
                          </span>
                        </td>
                        <td>{getStatusBadge(assignment.status)}</td>
                        <td>{assignment.dueDate}</td>
                        <td>
                          {assignment.financialLimits ? (
                            <div style={{ fontSize: '0.875rem' }}>
                              {assignment.financialLimits.min !== undefined && (
                                <div>Min: <strong>₹{assignment.financialLimits.min}</strong></div>
                              )}
                              {assignment.financialLimits.max !== undefined && (
                                <div>Max: <strong>₹{assignment.financialLimits.max}</strong></div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>None</span>
                          )}
                        </td>
                        <td>
                          {/* View button removed - view only */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: '#6b7280' 
                }}>
                  <p>No RACI assignments found.</p>
                  <p>When you are assigned responsibilities in RACI matrices, they will appear here.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h2>Upcoming Tasks</h2>
            </div>
            {raciAssignments.length > 0 ? (
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {raciAssignments.map(assignment => (
                  <div 
                    key={assignment.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleViewDetails(assignment)}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem' 
                    }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        background: getRoleColor(assignment.role),
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {assignment.role}
                        {renderFinancialLimitsBadge(assignment.financialLimits)}
                      </span>
                      {getStatusBadge(assignment.status)}
                    </div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                      {assignment.event}: {assignment.task}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Due: {assignment.dueDate}
                    </p>
                    {renderFinancialLimits(assignment)}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                color: '#6b7280' 
              }}>
                <p>No upcoming tasks found.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RACIDashboard;
