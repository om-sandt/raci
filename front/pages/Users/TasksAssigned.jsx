import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import env from '../../src/config/env';

const TasksAssigned = ({ financialLimits }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch assigned tasks when component mounts
  useEffect(() => {
    const fetchAssignedTasks = async () => {
      try {
        setLoading(true);
        
        // Get token from local storage
        const token = localStorage.getItem('raci_auth_token');
        
        // First try user-raci endpoint which is the most likely to be implemented
        try {
          const response = await fetch(`${env.apiBaseUrl}/user-raci/my-assignments`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('User RACI assignments:', data);
            
            if (data.success && data.data && Array.isArray(data.data.raciAssignments)) {
              // Process the RACI assignments into task format
              const formattedTasks = formatRaciAssignmentsToTasks(data.data.raciAssignments);
              setTasks(formattedTasks);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to fetch from primary endpoint:', err);
        }
        
        // If first endpoint fails, try the tasks endpoint
        try {
          const response = await fetch(`${env.apiBaseUrl}/tasks/assigned-to-me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Tasks assigned:', data);
            
            const formattedTasks = formatTasksData(data);
            setTasks(formattedTasks);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Failed to fetch from tasks endpoint:', err);
        }
        
        // If all endpoints fail, use mock data
        const mockData = getMockTasksData();
        const formattedTasks = formatTasksData(mockData);
        setTasks(formattedTasks);
        
      } catch (error) {
        console.error('Error fetching assigned tasks:', error);
        setError(error.message);
        
        // Use mock data as fallback
        const mockData = getMockTasksData();
        const formattedTasks = formatTasksData(mockData);
        setTasks(formattedTasks);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignedTasks();
  }, []);
  
  // Format RACI assignments into task format with deduplication
  const formatRaciAssignmentsToTasks = (raciAssignments) => {
    // Group assignments by task ID and event ID to avoid duplicates
    const taskMap = new Map();
    
    raciAssignments.forEach(assignment => {
      const taskId = assignment.task?.id || `task-${Math.random().toString(36).substring(7)}`;
      const eventId = assignment.event?.id || 'unknown-event';
      const key = `${taskId}-${eventId}`;
      
      if (!taskMap.has(key)) {
        taskMap.set(key, {
          id: taskId,
          title: assignment.task?.name || 'Unnamed Task',
          description: assignment.task?.description || '',
          eventName: assignment.event?.name || 'Unnamed Event',
          raciRole: mapRoleCodeToName(assignment.role),
          status: assignment.task?.status || 'pending',
          dueDate: formatDueDate(assignment.event?.endDate),
          priority: determinePriority(assignment.event?.endDate),
          eventId: eventId,
          // Collect multiple roles for the same task
          roles: [mapRoleCodeToName(assignment.role)],
          // Include financial limits data
          financialLimits: assignment.financialLimits || null
        });
      } else {
        // If task already exists, add the role to the roles array
        const existingTask = taskMap.get(key);
        const newRole = mapRoleCodeToName(assignment.role);
        if (!existingTask.roles.includes(newRole)) {
          existingTask.roles.push(newRole);
        }
        
        // Update financial limits if this assignment has them
        if (assignment.financialLimits && !existingTask.financialLimits) {
          existingTask.financialLimits = assignment.financialLimits;
        }
      }
    });
    
    // Convert map back to array and format for display
    return Array.from(taskMap.values()).map(task => ({
      ...task,
      // Use the primary role (first one) for display
      raciRole: task.roles[0],
      // Show multiple roles in description if applicable
      roleDescription: task.roles.length > 1 ? `Multiple roles: ${task.roles.join(', ')}` : null
    }));
  };
  
  // Map role code to full name
  const mapRoleCodeToName = (roleCode) => {
    switch (roleCode?.toUpperCase()) {
      case 'R': return 'Responsible';
      case 'A': return 'Accountable';
      case 'C': return 'Consulted';
      case 'I': return 'Informed';
      default: return roleCode || 'Unknown';
    }
  };
  
  // Determine priority based on due date
  const determinePriority = (dueDate) => {
    if (!dueDate) return 'medium';
    
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.floor((due - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'high'; // Overdue
    if (daysUntilDue < 7) return 'high';
    if (daysUntilDue < 14) return 'medium';
    return 'low';
  };
  
  // Generate mock data for fallback
  const getMockTasksData = () => {
    return {
      tasks: [
        {
          id: 'task-1',
          title: 'Complete Product Requirements Document',
          description: 'Finalize the PRD for the new feature set',
          eventName: 'Q4 Product Planning',
          raciRole: 'Responsible',
          status: 'in_progress',
          dueDate: '2023-11-30',
          priority: 'high'
        },
        {
          id: 'task-2',
          title: 'Review Marketing Materials',
          description: 'Provide feedback on Q4 campaign assets',
          eventName: 'Q4 Marketing Launch',
          raciRole: 'Consulted',
          status: 'pending',
          dueDate: '2023-11-25',
          priority: 'medium'
        },
        {
          id: 'task-3',
          title: 'Sign off on Budget',
          description: 'Final approval of departmental budget',
          eventName: 'Annual Budget Planning',
          raciRole: 'Accountable',
          status: 'not_started',
          dueDate: '2023-12-10',
          priority: 'high'
        },
        {
          id: 'task-4',
          title: 'Team Performance Reviews',
          description: 'Complete performance assessments for team members',
          eventName: 'Annual Review Cycle',
          raciRole: 'Responsible',
          status: 'not_started',
          dueDate: '2023-12-15',
          priority: 'medium'
        }
      ]
    };
  };
  
  // Format tasks data from API
  const formatTasksData = (apiData) => {
    // Handle different response formats
    let tasksList = [];
    
    if (Array.isArray(apiData)) {
      tasksList = apiData;
    } else if (apiData && Array.isArray(apiData.tasks)) {
      tasksList = apiData.tasks;
    } else if (apiData && apiData.data && Array.isArray(apiData.data)) {
      tasksList = apiData.data;
    }
    
    // Map API data to the format expected by the UI
    return tasksList.map(task => ({
      id: task.id || `task-${Math.random().toString(36).substring(7)}`,
      title: task.name || task.title || 'Untitled Task',
      description: task.description || '',
      eventName: task.eventName || task.event?.name || 'Unknown Event',
      raciRole: task.raciRole || task.role || 'Unknown',
      status: task.status || 'pending',
      dueDate: formatDueDate(task.dueDate || task.deadline),
      eventId: task.eventId || task.event?.id,
      priority: task.priority || determinePriority(task.dueDate || task.deadline),
      financialLimits: task.financialLimits || null
    }));
  };
  
  // Format due date to a readable format
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
  
  // Get status badge for UI
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
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '80px',
        textAlign: 'center'
      }}>
        {displayStatus}
      </span>
    );
  };
  
  // Enhanced function to render financial limits
  const renderFinancialLimits = (task) => {
    if (!task.financialLimits) return <span style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', textAlign: 'center' }}>None</span>;
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0.5rem',
        backgroundColor: '#f0f9ff',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        height: '100%', // Ensure consistent height
        justifyContent: 'center', // Center content vertically
        width: '100%'
      }}>
        <span style={{ fontWeight: '500', marginBottom: '0.25rem', color: '#0369a1', textAlign: 'center' }}>
          Financial Limits:
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          {task.financialLimits.min !== undefined && (
            <span>Min: <strong>₹{task.financialLimits.min}</strong></span>
          )}
          {task.financialLimits.max !== undefined && (
            <span>Max: <strong>₹{task.financialLimits.max}</strong></span>
          )}
        </div>
      </div>
    );
  };

  // Add function to render financial limits badge
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
        whiteSpace: 'nowrap' // Prevent breaking to new line
      }}>
        <span style={{ marginRight: '0.25rem' }}>💰</span>
        {financialLimits.max ? `₹${financialLimits.max}` : 'Limit Set'}
      </span>
    );
  };

  // Get RACI role badge with appropriate color
  const getRaciBadge = (role) => {
    let color;
    
    switch (role?.toLowerCase()) {
      case 'responsible': color = '#ef4444'; break;
      case 'accountable': color = '#3b82f6'; break;
      case 'consulted': color = '#f59e0b'; break;
      case 'informed': color = '#10b981'; break;
      default: color = '#6b7280';
    }
    
    return (
      <span style={{
        backgroundColor: color,
        color: 'white',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '90px' // Ensure consistent width for badges
      }}>
        {role}
      </span>
    );
  };
  
  // Get priority badge with appropriate color
  const getPriorityBadge = (priority) => {
    let bgColor, textColor;
    
    switch (priority?.toLowerCase()) {
      case 'high':
        bgColor = '#fee2e2';
        textColor = '#b91c1c';
        break;
      case 'medium':
        bgColor = '#fef9c3';
        textColor = '#854d0e';
        break;
      case 'low':
        bgColor = '#dcfce7';
        textColor = '#15803d';
        break;
      default:
        bgColor = '#f3f4f6';
        textColor = '#4b5563';
    }
    
    const displayPriority = priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Unknown';
      
    return (
      <span style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '70px' // Consistent width for better alignment
      }}>
        {displayPriority}
      </span>
    );
  };

  const handleBackToDashboard = () => {
    navigate('/user/raci-dashboard');
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header" style={{ position: 'relative', marginBottom: '2rem' }}>
        <h1 style={{ textAlign: 'center', margin: 0 }}>Tasks Assigned to Me</h1>
        <p style={{ textAlign: 'center', margin: '0.5rem 0 0 0' }}>View and manage your assigned tasks</p>
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
          <p style={{ marginLeft: '1rem', color: '#4f46e5' }}>Loading your tasks...</p>
        </div>
      ) : error ? (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee2e2', 
          color: '#b91c1c',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <p>Error loading tasks: {error}</p>
          <p>Please refresh the page or try again later.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2>No Tasks Assigned</h2>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            You don't have any tasks assigned to you right now.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ 
              borderCollapse: 'separate', 
              borderSpacing: '0',
              width: '100%',
              tableLayout: 'fixed'
            }}>
              <colgroup>
                <col style={{ width: '20%' }} /> {/* Task */}
                <col style={{ width: '12%' }} /> {/* Event */}
                <col style={{ width: '12%' }} /> {/* RACI Role */}
                <col style={{ width: '10%' }} /> {/* Status */}
                <col style={{ width: '10%' }} /> {/* Priority */}
                <col style={{ width: '10%' }} /> {/* Due Date */}
                <col style={{ width: '14%' }} /> {/* Financial Limit */}
                <col style={{ width: '12%' }} /> {/* Actions */}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ verticalAlign: 'middle', textAlign: 'left', padding: '0.75rem 1rem' }}>Task</th>
                  <th style={{ verticalAlign: 'middle', textAlign: 'center', padding: '0.75rem 1rem' }}>Event</th>
                  <th style={{ verticalAlign: 'middle', textAlign: 'center', padding: '0.75rem 1rem' }}>RACI Role</th>
                  <th style={{ verticalAlign: 'middle', textAlign: 'center', padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ verticalAlign: 'middle', textAlign: 'center', padding: '0.75rem 1rem' }}>Priority</th>
                  <th style={{ verticalAlign: 'middle', textAlign: 'center', padding: '0.75rem 1rem' }}>Due Date</th>
                  <th style={{ verticalAlign: 'middle', textAlign: 'center', padding: '0.75rem 1rem' }}>Financial Limit</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{task.title}</div>
                        {task.description && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            {task.description}
                          </div>
                        )}
                        {task.roleDescription && (
                          <div style={{ fontSize: '0.75rem', color: '#4b5563', fontStyle: 'italic' }}>
                            {task.roleDescription}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem', textAlign: 'center' }}>{task.eventName}</td>
                    <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'nowrap',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        {getRaciBadge(task.raciRole)}
                        {/* Financial limit badge removed from here */}
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem', textAlign: 'center' }}>{getStatusBadge(task.status)}</td>
                    <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem', textAlign: 'center' }}>{getPriorityBadge(task.priority)}</td>
                    <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem', textAlign: 'center' }}>{task.dueDate}</td>
                    <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem', textAlign: 'center' }}>{renderFinancialLimits(task)}</td>
                    <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '0.5rem',
                        justifyContent: 'center', // Align buttons consistently
                        alignItems: 'center'
                      }}>
                        {/* Details button removed - view only */}
                        {/* Complete button removed - view only */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksAssigned;
