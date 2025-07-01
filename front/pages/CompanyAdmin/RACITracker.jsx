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
    <div className="dashboard-layout fix-layout">
      <aside className="sidebar">
        <div className="brand" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px',
          height: '64px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {renderCompanyLogo()}
            <span style={{ fontWeight: '600', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white', letterSpacing: '0.5px' }}>
              {companyData ? companyData.name : 'Company'}
            </span>
          </div>
        </div>
        
        <nav>
          <NavLink to="/company-admin/dashboard" className="nav-item">
            <i className="icon">📊</i> Dashboard
          </NavLink>
          
          <div 
            className={`nav-item`}
            onClick={() => toggleSection('users')}
          >
            <i className="icon">👥</i> 
            <span>User Administration</span>
            <i className={`dropdown-icon ${expandedSections.users ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.users ? 'open' : ''}`}>
            <NavLink to="/company-admin/user-creation" className="nav-item">
              Create User
            </NavLink>
            <NavLink to="/company-admin/user-management" className="nav-item">
              Update User
            </NavLink>
          </div>
          
          <div 
            className={`nav-item`}
            onClick={() => toggleSection('departments')}
          >
            <i className="icon">🏢</i> 
            <span>Department Workspace</span>
            <i className={`dropdown-icon ${expandedSections.departments ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.departments ? 'open' : ''}`}>
            <NavLink to="/company-admin/department-creation" className="nav-item">
              Create Department
            </NavLink>
            <NavLink to="/company-admin/department-management" className="nav-item">
              Department Workspace
            </NavLink>
          </div>

          <div 
            className={`nav-item`}
            onClick={() => toggleSection('designations')}
          >
            <i className="icon">🏷️</i> 
            <span>Designation Directory</span>
            <i className={`dropdown-icon ${expandedSections.designations ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.designations ? 'open' : ''}`}>
            <NavLink to="/company-admin/designation-creation" className="nav-item">
              Create Designation
            </NavLink>
            <NavLink to="/company-admin/designation-management" className="nav-item">
              Update Designation
            </NavLink>
          </div>

          <div 
            className={`nav-item`}
            onClick={() => toggleSection('locations')}
          >
            <i className="icon">📍</i> 
            <span>Location Center</span>
            <i className={`dropdown-icon ${expandedSections.locations ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.locations ? 'open' : ''}`}>
            <NavLink to="/company-admin/location-creation" className="nav-item">
              Create Location
            </NavLink>
            <NavLink to="/company-admin/location-management" className="nav-item">
              Update Location
            </NavLink>
          </div>
          
          <div 
            className={`nav-item active`}
            onClick={() => toggleSection('raci')}
          >
            <i className="icon">📅</i> 
            <span>RACI Operations</span>
            <i className={`dropdown-icon ${expandedSections.raci ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.raci ? 'open' : ''}`}>
            <NavLink to="/company-admin/event-master" className="nav-item">
              Event Master
            </NavLink>
            <NavLink to="/company-admin/event-list" className="nav-item">
              Event List
            </NavLink>
            <NavLink to="/company-admin/raci-assignment" className="nav-item">
              RACI Assignment
            </NavLink>
            <NavLink to="/company-admin/raci-tracker" className="nav-item active">
              RACI Tracker
            </NavLink>
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
      
      <main className="dashboard-content fix-content">
        <header className="dashboard-header">
          <div className="dashboard-title">
            {companyData ? `${companyData.name} Administration` : 'Administration'}
          </div>
          <div className="header-actions">
            <div className="user-info">
              <div className="user-avatar">
                {renderUserPhoto()}
              </div>
              <div className="user-details">
                <div className="user-name">{currentUser ? currentUser.name : 'Loading...'}</div>
                <div className="user-role">{currentUser ? currentUser.role : 'Loading...'}</div>
              </div>
            </div>
            {/* Logout button removed from header as it exists in the sidebar */}
          </div>
        </header>
        
        <div className="content-wrapper fix-wrapper">
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
      
      <style jsx="true" global="true">{`
        .fix-layout {
          display: flex;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          position: relative;
          margin: 0;
          padding: 0;
        }
        
        .sidebar {
          width: 300px;
          height: 100vh;
          background-color: white;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          position: sticky;
          top: 0;
          left: 0;
          z-index: 10;
          margin: 0;
          padding: 0;
        }
        
        .fix-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          height: 100vh;
          padding: 0 !important;
          margin: 0;
        }
        
        .fix-wrapper {
          padding: 1.5rem !important;
          margin: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          width: 100% !important;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background-color: white;
          position: sticky;
          top: 0;
          z-index: 5;
          margin: 0;
          width: 100%;
        }
        
        .dashboard-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }
        
        .user-info {
          display: flex;
          align-items: center;
        }
        
        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #4f46e5;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-right: 0.75rem;
        }
        
        .user-name {
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .user-role {
          font-size: 0.8rem;
          color: #6b7280;
        }
        
        .page-header h1 {
          margin: 0 0 0.25rem 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .page-header p {
          margin: 0;
          color: #6b7280;
        }
        
        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }
        
        .stat-card {
          background: white;
          padding: 1.25rem;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07);
          text-align: center;
        }
        
        .stat-value {
          font-size: 1.75rem;
          font-weight: 600;
          color: #4f46e5;
          margin-bottom: 0.25rem;
        }
        
        .stat-label {
          font-size: 0.95rem;
          color: #6b7280;
        }
        
        .card {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07);
          margin-bottom: 1.5rem;
          overflow: hidden;
        }
        
        .card-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }
        
        .card-header h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }
        
        .card-body {
          padding: 1.5rem;
        }
        
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        
        .event-card {
          background: white;
          border-radius: 0.375rem;
          border: 1px solid #e5e7eb;
          padding: 1.25rem;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        
        .event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
        }
        
        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .event-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
          color: #111827;
        }
        
        .event-status {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-weight: 500;
        }
        
        .status-not_started {
          background: #f3f4f6;
          color: #4b5563;
        }
        
        .status-in_progress {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .status-pending_approval {
          background: #fef3c7;
          color: #92400e;
        }
        
        .status-approved {
          background: #d1fae5;
          color: #065f46;
        }
        
        .status-completed {
          background: #c7d2fe;
          color: #3730a3;
        }
        
        .status-rejected {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .event-details {
          margin-bottom: 0.75rem;
        }
        
        .event-details p {
          margin: 0 0 0.5rem;
          color: #6b7280;
          font-size: 0.95rem;
          min-height: 1.5em;
          display: block;
        }
        
        .event-dates {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: #6b7280;
        }
        
        .raci-summary {
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .raci-summary h4 {
          font-size: 1rem;
          font-weight: 500;
          margin: 0 0 0.5rem;
          color: #111827;
        }
        
        .raci-data {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .raci-data p {
          margin: 0;
          font-size: 0.95rem;
          color: #4b5563;
        }
        
        .no-raci-data {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .no-raci-data p {
          margin: 0;
          font-size: 0.95rem;
          color: #6b7280;
          font-style: italic;
        }
        
        .btn {
          display: inline-block;
          font-weight: 500;
          text-align: center;
          vertical-align: middle;
          cursor: pointer;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          border: none;
          transition: background-color 0.15s;
        }
        
        .btn-sm {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 0.25rem;
        }
        
        .btn-primary {
          background-color: #4f46e5;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #4338ca;
        }
        
        .loading-indicator {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }
        
        .no-data-message {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }
        
        /* Sidebar nav styling */
        .brand {
          height: 64px;
          padding: 15px 12px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          background-color: white;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        
        nav {
          padding: 0;
          overflow-y: auto;
        }
        
        .sub-nav {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
          background-color: rgba(249, 250, 251, 0.5);
        }
        
        .sub-nav.open {
          max-height: 500px;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          color: #4b5563;
          text-decoration: none;
          position: relative;
          font-size: 0.95rem;
          transition: background-color 0.15s;
        }
        
        .nav-item:hover {
          background-color: #f3f4f6;
        }
        
        .nav-item.active {
          color: #4f46e5;
          font-weight: 500;
        }
        
        .sub-nav .nav-item {
          padding-left: 2.5rem;
        }
        
        .icon {
          margin-right: 0.75rem;
          display: inline-block;
          width: 1.25rem;
          text-align: center;
        }
        
        .dropdown-icon {
          position: absolute;
          right: 1rem;
          font-size: 0.75rem;
          transition: transform 0.2s;
        }
        
        .dropdown-icon.open {
          transform: rotate(180deg);
        }
        
        @media (max-width: 1024px) {
          .fix-layout {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
          }
          
          .sidebar {
            width: 100%;
            height: auto;
            position: relative;
            border-right: none;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .fix-content {
            margin-left: 0;
            height: auto;
          }
          
          .sub-nav.open {
            max-height: 300px;
          }
          
          .brand {
            position: static;
          }
        }
      `}</style>
    </div>
  );
};

export default RACITracker;
