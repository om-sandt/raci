import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import env from '../../src/config/env';
import authService from '../../src/services/auth.service';
import raciService from '../../src/services/raci.service';
import '../../styles/dashboard.scss';

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

const RACITracker = () => {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalEmail, setApprovalEmail] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [allEventsRaciData, setAllEventsRaciData] = useState([]);
  const [loadingAllEventsRaci, setLoadingAllEventsRaci] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [eventEmployees, setEventEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isLoadingRaciData, setIsLoadingRaciData] = useState(false);
  const [existingDataFound, setExistingDataFound] = useState(false);
  const [dropdownRefreshKey, setDropdownRefreshKey] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [eventTasks, setEventTasks] = useState([]);
  const [raci, setRaci] = useState({
    tasks: [],
    users: []
  });
  const [financialLimits, setFinancialLimits] = useState({});
  const [financialLimitValues, setFinancialLimitValues] = useState({});
  const [selectedEmployees, setSelectedEmployees] = useState({
    responsible: {},
    accountable: {},
    consulted: {},
    informed: {}
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  
  // Add state for sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: false,
    designations: false,
    locations: false,
    raci: true // Auto-expand RACI section since we're on RACI Tracker
  });
  
  // Toggle sidebar sections
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };
  
  // Function to fetch RACI data for events using the RACI service
  const fetchAllEventsRaciData = async (events) => {
    if (!events || events.length === 0) {
      setAllEventsRaciData([]);
      setLoadingAllEventsRaci(false);
      return;
    }
    
    setLoadingAllEventsRaci(true);
    
    // Map through events and fetch RACI data for each using the service
    const raciDataPromises = events.map(async (event) => {
      try {
        const raciData = await raciService.getRACIMatrixByEvent(event.id);
        return {
          event,
          raciData,
          hasData: true,
          approvalStatus: raciData?.approvalStatus || raciData?.status || 'not_submitted'
        };
      } catch (error) {
        console.error(`Error fetching RACI data for event ${event.id}:`, error);
        return {
          event,
          raciData: null,
          hasData: false,
          error: error.message,
          approvalStatus: 'not_submitted'
        };
      }
    });
    
    const results = await Promise.all(raciDataPromises);
    setAllEventsRaciData(results);
    setLoadingAllEventsRaci(false);
  };
  
  // Enhanced function to process employee data consistently
  const formatEmployeeData = (employee) => {
    return {
      id: String(employee.id || '0'),
      name: employee.name || employee.fullName || 'Unknown User',
      role: employee.designation || employee.role || employee.title || '',
      email: employee.email || '',
      department: employee.department?.name || employee.departmentName || ''
    };
  };

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
              parent.innerHTML = '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">' + (companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C') + '</div>';
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
              parent.innerHTML = '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">' + (companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C') + '</div>';
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
            parent.innerHTML = '<div style="width: 100%; height: 100%; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">' + (currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U') + '</div>';
          }}
        />
      );
    }
    return currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  };

  // Function to view event details
  const viewEventDetails = (eventId) => {
    navigate(`/company-admin/event/${eventId}`);
  };
  
  // Update handleEventChange to also load existing RACI matrix when an event is selected
  const handleEventChange = async (e) => {
    const eventId = e.target.value;
    setSelectedEvent(eventId);
    
    // Clear existing selections when changing events
    if (eventId !== selectedEvent) {
      setSelectedEmployees({
        responsible: {},
        accountable: {},
        consulted: {},
        informed: {}
      });
      setFinancialLimits({});
      setFinancialLimitValues({});
    }
    
    if (!eventId) {
      setEventEmployees([]);
      setEventTasks([]);
      return;
    }
    
    try {
      setLoadingEmployees(true);
      
      const token = localStorage.getItem('raci_auth_token');
      
      // Fetch full event data which contains employees and tasks
      const response = await fetch(`${env.apiBaseUrl}/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch event details: ${response.status}`);
      }
      
      const eventData = await response.json();
      
      // Process employees
      if (eventData.employees && Array.isArray(eventData.employees)) {
        const formattedEmployees = eventData.employees.map(formatEmployeeData);
        setEventEmployees(formattedEmployees);
        
        setTimeout(() => {
          setLoadingEmployees(false);
          setDropdownRefreshKey(prev => prev + 1);
        }, 100);
      } else if (eventData.department?.id) {
        await fetchDepartmentEmployees(eventData.department.id);
      } else {
        setEventEmployees([]);
        setLoadingEmployees(false);
      }
      
      // Process tasks
      if (eventData.tasks && Array.isArray(eventData.tasks)) {
        console.log('Event tasks data:', eventData.tasks);
        
        // Update tasks from event data
        const formattedTasks = eventData.tasks.map(task => ({
          id: task.id,
          name: task.name || 'Unnamed Task',
          description: task.description || '',
          status: task.status || 'not_started',
          responsible: [],
          accountable: [],
          consulted: [],
          informed: []
        }));
        
        setEventTasks(formattedTasks);
        setTasks(formattedTasks);
        
        // Also update RACI state to maintain consistency
        setRaci(prev => ({
          ...prev,
          tasks: formattedTasks.map(task => ({
            id: String(task.id),
            name: task.name,
            assignments: []
          }))
        }));
      } else {
        // If no tasks are found, we can keep some default empty tasks
        const defaultTasks = [
          { id: 1, name: '', responsible: [], accountable: [], consulted: [], informed: [] },
          { id: 2, name: '', responsible: [], accountable: [], consulted: [], informed: [] },
          { id: 3, name: '', responsible: [], accountable: [], consulted: [], informed: [] },
        ];
        setEventTasks([]);
        setTasks(defaultTasks);
      }
      
      // Load existing RACI matrix for this event
      await loadExistingRaciMatrix(eventId);
      
    } catch (error) {
      console.error('Error fetching event data:', error);
      setEventEmployees([]);
      setEventTasks([]);
      setLoadingEmployees(false);
    }
  };

  // Helper function to fetch department employees
  const fetchDepartmentEmployees = async (departmentId) => {
    if (!departmentId) return;
    
    try {
      const token = localStorage.getItem('raci_auth_token');
      const deptResponse = await fetch(`${env.apiBaseUrl}/departments/${departmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        console.log('Department data:', deptData);
        
        if (deptData && deptData.employees && Array.isArray(deptData.employees)) {
          const formattedDeptEmployees = deptData.employees.map(user => ({
            id: String(user.id), // Ensure ID is string
            name: user.name || 'Unknown',
            role: user.designation || user.role || 'Employee',
            email: user.email,
            department: deptData.name
          }));
          
          setEventEmployees(formattedDeptEmployees);
          console.log('Department-specific employees loaded:', formattedDeptEmployees.length);
        } else {
          // No employees in department, clear event employees
          setEventEmployees([]);
        }
      }
    } catch (error) {
      console.error('Error fetching department employees:', error);
      setEventEmployees([]);
    }
  };

  // Load existing RACI matrix using the RACI service
  const loadExistingRaciMatrix = async (eventId) => {
    if (!eventId) return;
    
    setIsLoadingRaciData(true);
    
    try {
      const raciData = await raciService.getRACIMatrixByEvent(eventId);
      
      if (raciData) {
        console.log('Retrieved RACI matrix for tracker:', raciData);
        // Here you would populate the UI with the RACI data
        // This implementation depends on how you want to display the data in the tracker
        setExistingDataFound(true);
      } else {
        setExistingDataFound(false);
      }
    } catch (error) {
      console.error('Error loading RACI matrix for tracker:', error);
      setExistingDataFound(false);
    } finally {
      setIsLoadingRaciData(false);
    }
  };

  // Use effect to load events when component mounts
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('raci_auth_token');
        const response = await fetch(`${env.apiBaseUrl}/events`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const eventsData = await response.json();
        const eventsList = Array.isArray(eventsData) ? eventsData : 
                          (eventsData.events || eventsData.data || []);
        
        setEvents(eventsList);
        
        // After loading events, fetch RACI data for all
        if (eventsList.length > 0) {
          fetchAllEventsRaciData(eventsList);
        } else {
          setLoadingAllEventsRaci(false);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setLoadingEvents(false);
        setLoadingAllEventsRaci(false);
      } finally {
        setLoadingEvents(false);
      }
    };
    
    fetchEvents();
  }, []);

  // Debugging effect for selections
  useEffect(() => {
    if (existingDataFound) {
      console.log('Current selected employees:', selectedEmployees);
    }
  }, [selectedEmployees, existingDataFound]);

  // Helper function to check if an employee is already assigned
  const isEmployeeAssignedElsewhere = (taskId, currentRole, employeeId) => {
    if (!employeeId) return false;
    
    // Check if this employee is assigned to any other role for this task
    const roles = ['responsible', 'accountable', 'consulted', 'informed'];
    
    // Look through all roles except the current one
    return roles
      .filter(role => role !== currentRole)
      .some(role => selectedEmployees[role][taskId] === employeeId);
  };

  // Handle employee selection
  const handleEmployeeSelect = (taskId, role, userId) => {
    // Create a copy of the current selections
    const updatedSelections = { ...selectedEmployees };
    
    // If the user selected an employee (not clearing the selection)
    if (userId) {
      // Remove this employee from any other role for this task
      const roles = ['responsible', 'accountable', 'consulted', 'informed'];
      roles.forEach(otherRole => {
        if (otherRole !== role && updatedSelections[otherRole][taskId] === userId) {
          delete updatedSelections[otherRole][taskId];
        }
      });
    }
    
    // Update the selection for the current role
    updatedSelections[role] = {
      ...updatedSelections[role],
      [taskId]: userId
    };
    
    setSelectedEmployees(updatedSelections);
  };

  // Handle financial limit changes
  const handleFinancialLimitChange = (taskId, userId, role, value) => {
    const key = `${role}-${taskId}-${userId}`;
    // Ensure value is a valid number or empty string
    const sanitizedValue = value === '' ? '' : Number(value) >= 0 ? value : '0';
    
    setFinancialLimitValues(prev => {
      const updated = {
        ...prev,
        [key]: sanitizedValue
      };
      console.log(`Updated financial limit for ${role} ${userId} on task ${taskId} (min: 0, max: ${sanitizedValue})`);
      return updated;
    });
  };

  // Toggle financial limit
  const toggleFinancialLimit = (taskId, userId, role) => {
    const key = `${role}-${taskId}-${userId}`;
    console.log('Toggling financial limit for:', key);
    
    setFinancialLimits(prev => {
      const newState = {
        ...prev,
        [key]: !prev[key]
      };
      
      // If turning on a financial limit and no value is set, initialize with empty string
      if (newState[key] && !financialLimitValues[key]) {
        setFinancialLimitValues(prevValues => ({
          ...prevValues,
          [key]: prevValues[key] || ''
        }));
      }
      
      return newState;
    });
  };

  // Add new task to RACI
  const addNewTaskToRaci = (task) => {
    setRaci(prevRaci => {
      const updatedTasks = [...prevRaci.tasks, task];
      return {
        ...prevRaci,
        tasks: updatedTasks
      };
    });
  };

  // Save task edit
  const saveTaskEdit = () => {
    if (editingTaskId && editingTaskName.trim()) {
      // Update the task name in the RACI data
      setRaci(prevRaci => {
        const updatedTasks = prevRaci.tasks.map(task => 
          task.id === editingTaskId ? { ...task, name: editingTaskName.trim() } : task
        );
        
        return {
          ...prevRaci,
          tasks: updatedTasks
        };
      });
      
      // Also update the task name in the tasks state
      setTasks(prevTasks => {
        return prevTasks.map(task => 
          task.id.toString() === editingTaskId.toString() ? { ...task, name: editingTaskName.trim() } : task
        );
      });
    }
    // Exit edit mode
    setEditingTaskId(null);
  };

  // Start editing a task
  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskName(task.name);
  };

  // Add new task
  const addNewTask = () => {
    try {
      console.log('Adding new task...');
      
      // Create a new task with a unique ID
      // First find the maximum ID from both task states
      const maxRaciId = raci.tasks && raci.tasks.length > 0 
        ? Math.max(...raci.tasks.map(task => Number(task.id || 0)))
        : 0;
      
      const maxTasksId = tasks && tasks.length > 0
        ? Math.max(...tasks.map(task => Number(task.id || 0)))
        : 0;
      
      const newId = Math.max(maxRaciId, maxTasksId) + 1;
      const newIdStr = String(newId);
      
      // Create a new task for raci state
      const newRaciTask = {
        id: newIdStr,
        name: '', // Blank name initially
        assignments: []
      };
      
      // Create a new task for tasks state
      const newTask = {
        id: newId,
        name: '', // Blank name initially
        responsible: [],
        accountable: [],
        consulted: [],
        informed: []
      };
      
      // Update both state objects
      setRaci(prevRaci => ({
        ...prevRaci,
        tasks: [...(prevRaci.tasks || []), newRaciTask]
      }));
      
      setTasks(prevTasks => [...prevTasks, newTask]);
      
      // Start editing the new task immediately
      setTimeout(() => {
        startEditingTask(newTask);
      }, 10);
      
    } catch (error) {
      console.error('Error adding new task:', error);
    }
  };

  // Get display employees
  const getDisplayEmployees = () => {
    // Only return event employees when an event is selected
    if (selectedEvent && eventEmployees && Array.isArray(eventEmployees) && eventEmployees.length > 0) {
      return eventEmployees;
    }
    
    // Only use company employees as a fallback if absolutely necessary
    if (!selectedEvent) {
      return employees;
    }
    
    // If we have a selected event but no event employees, return empty array
    return [];
  };

  // Formatting function for event status
  const formatEventStatus = (status) => {
    if (!status) return 'Not Started';
    
    const statusMap = {
      'not_started': 'Not Started',
      'in_progress': 'In Progress',
      'pending_approval': 'Pending Approval',
      'approved': 'Approved',
      'completed': 'Completed',
      'rejected': 'Rejected'
    };
    
    return statusMap[status.toLowerCase()] || status;
  };

  // Function to render an event card with its RACI summary
  const renderEventCard = (eventData) => {
    const { event, raciData, hasData, error } = eventData;

    return (
      <div key={event.id} className="event-card">
        <div className="event-header">
          <h3>{event.name}</h3>
          <span className={`event-status status-${event.status || 'not_started'}`}>
            {formatEventStatus(event.status)}
          </span>
        </div>
        <div className="event-details">
          {(() => {
            const desc = event.description || event.desc || event.details || event.eventDescription || event.event_description || event.eventDetails;
            return desc && String(desc).trim() ? <p>{desc}</p> : null;
          })()}
          {event.startDate && (
            <div className="event-dates">
              <span>Start: {new Date(event.startDate).toLocaleDateString()}</span>
              {event.endDate && (
                <span>End: {new Date(event.endDate).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
        <div className="raci-summary">
          <h4>RACI Matrix</h4>
          {hasData ? (
            <div className="raci-data">
              <p>Total tasks: {raciData.tasks ? raciData.tasks.length : 0}</p>
              {/* Approval Status */}
              {raciData.status && (
                <div style={{ 
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  backgroundColor: raciData.status === 'PENDING_APPROVAL' ? '#fef3c7' : raciData.status === 'APPROVED' ? '#d1fae5' : '#fecaca',
                  color: raciData.status === 'PENDING_APPROVAL' ? '#92400e' : raciData.status === 'APPROVED' ? '#065f46' : '#dc2626',
                  border: `1px solid ${raciData.status === 'PENDING_APPROVAL' ? '#f59e0b' : raciData.status === 'APPROVED' ? '#10b981' : '#ef4444'}`
                }}>
                  <strong>Status:</strong> {raciData.status === 'PENDING_APPROVAL' ? 'Pending Approval' : raciData.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  
                  {/* Show approval progress if available */}
                  {raciData.approvalSummary && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '0.25rem',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderRadius: '3px',
                        marginBottom: '0.25rem'
                      }}>
                        <span>Approved: {raciData.approvalSummary.approved || 0}</span>
                        <span>Pending: {raciData.approvalSummary.pending || 0}</span>
                        <span>Total: {raciData.approvalSummary.total || 0}</span>
                      </div>
                      
                      {/* Level breakdown */}
                      {raciData.levelSummary && raciData.levelSummary.length > 0 && (
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>By Level:</div>
                          {raciData.levelSummary.map((level, index) => (
                            <div key={index} style={{ 
                              fontSize: '0.625rem',
                              padding: '0.125rem 0.25rem',
                              backgroundColor: level.pending > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              borderRadius: '2px',
                              marginBottom: '0.125rem',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}>
                              <span>Level {level.level}</span>
                              <span>{level.approved}/{level.total}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {raciData.comments && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                      <strong>Comments:</strong> {raciData.comments}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="no-raci-data">
              <p>{error || 'No RACI matrix defined yet'}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calculate pending approval count - Include all events since they are in pending stage
  const pendingApprovalCount = allEventsRaciData.filter(item => {
    if (!item.event) return false;
    
    // Count all events as pending since they are in pending stage
    return true;
  }).length;

  // Calculate total events with RACI matrix
  const eventsWithRaciMatrix = allEventsRaciData.filter(item => item.hasData).length;

  // Calculate approved matrices - This will be 0 since all are pending
  const approvedMatrices = 0;

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

  return (
    <div className="dashboard-layout-new">
      <header className="dashboard-header-new">
        <div className="header-left">
          <div className="company-info">
            <button 
              onClick={() => navigate('/company-admin/dashboard')}
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
                RACI Tracker
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
            <h1>RACI Tracker</h1>
            <p>Track and manage responsibility matrices for all company events</p>
          </div>
          
          <div className="dashboard-stats">
            <div className="stat-card" style={{
              background: 'linear-gradient(to right, #4f46e5, #6366f1)',
              color: 'white',
              boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)'
            }}>
              <div className="stat-value" style={{ color: 'white' }}>{events.length}</div>
              <div className="stat-label" style={{ opacity: 0.9, color: 'white' }}>Total Events</div>
            </div>
            <div className="stat-card" style={{
              background: 'linear-gradient(to right, #0ea5e9, #38bdf8)',
              color: 'white',
              boxShadow: '0 4px 6px rgba(14, 165, 233, 0.2)'
            }}>
              <div className="stat-value" style={{ color: 'white' }}>{eventsWithRaciMatrix}</div>
              <div className="stat-label" style={{ opacity: 0.9, color: 'white' }}>Events with RACI Matrix</div>
            </div>
            <div className="stat-card" style={{
              background: 'linear-gradient(to right, #10b981, #34d399)',
              color: 'white',
              boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
            }}>
              <div className="stat-value" style={{ color: 'white' }}>{approvedMatrices}</div>
              <div className="stat-label" style={{ opacity: 0.9, color: 'white' }}>Approved Matrices</div>
            </div>
            <div className="stat-card" style={{
              background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
              color: 'white',
              boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)'
            }}>
              <div className="stat-value" style={{ color: 'white' }}>{pendingApprovalCount}</div>
              <div className="stat-label" style={{ opacity: 0.9, color: 'white' }}>Pending Approval</div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h2>All Events</h2>
            </div>
            <div className="card-body">
              {loadingEvents || loadingAllEventsRaci ? (
                <div className="loading-indicator">Loading events data...</div>
              ) : events.length === 0 ? (
                <div className="no-data-message">
                  <p>No events found. Create events to start defining RACI matrices.</p>
                </div>
              ) : (
                <div className="events-grid">
                  {allEventsRaciData.map(eventData => renderEventCard(eventData))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RACITracker;
