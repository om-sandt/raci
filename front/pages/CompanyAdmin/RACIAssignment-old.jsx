import React, { useState, useEffect } from 'react';
import env from '../../src/config/env';

const RACIAssignment = () => {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalEmail, setApprovalEmail] = useState('');
  
  // Add state for real employees and loading state
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeeError, setEmployeeError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  
  // Add state for real events and loading state
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventError, setEventError] = useState(null);
  
  // Add state to track if existing RACI data was found
  const [existingDataFound, setExistingDataFound] = useState(false);
  const [isLoadingRaciData, setIsLoadingRaciData] = useState(false);
  
  // Add state for event-associated employees
  const [eventEmployees, setEventEmployees] = useState(() => {
    // Try to load from localStorage for debugging purposes
    try {
      const saved = localStorage.getItem('debug_event_employees');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('Loaded event employees from localStorage:', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
    return [];
  });
  
  // Add a side effect to save event employees to localStorage for debugging
  useEffect(() => {
    if (eventEmployees && eventEmployees.length > 0) {
      try {
        localStorage.setItem('debug_event_employees', JSON.stringify(eventEmployees));
        console.log('Saved event employees to localStorage:', eventEmployees);
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  }, [eventEmployees]);
  
  // Add this at the top level of your component, right after the useState declarations
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try localStorage first, then sessionStorage
        let token = localStorage.getItem('raci_auth_token') || sessionStorage.getItem('raci_auth_token');
        let currentCompanyId = localStorage.getItem('raci_company_id') || sessionStorage.getItem('raci_company_id');

        if (!token) {
          console.error('No auth token found in either localStorage or sessionStorage');
          return;
        }

        // If token was in sessionStorage but not localStorage, copy it to localStorage
        if (!localStorage.getItem('raci_auth_token')) {
          localStorage.setItem('raci_auth_token', token);
        }

        // Get user data and company ID if we don't have it
        if (!currentCompanyId) {
          const userResponse = await fetch(`${env.apiBaseUrl}/auth/current-user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });

          if (!userResponse.ok) {
            throw new Error(`Failed to fetch user details: ${userResponse.status}`);
          }

          const userData = await userResponse.json();
          if (userData.company?.id) {
            localStorage.setItem('raci_company_id', userData.company.id);
            sessionStorage.setItem('raci_company_id', userData.company.id);
            setCompanyId(userData.company.id);
            currentCompanyId = userData.company.id;
          }
        } else {
          setCompanyId(currentCompanyId);
        }

        if (!currentCompanyId) {
          throw new Error('No company ID found or retrieved');
        }

      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear potentially invalid tokens
        if (error.message.includes('401') || error.message.includes('403')) {
          localStorage.removeItem('raci_auth_token');
          sessionStorage.removeItem('raci_auth_token');
          localStorage.removeItem('raci_company_id');
          sessionStorage.removeItem('raci_company_id');
        }
      }
    };

    initAuth();
  }, []);
  
  // Fetch real events from the API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        setEventError(null);
        
        // Use direct fetch for better error handling
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
        console.log('Events data:', eventsData);
        
        // Handle different response formats
        let eventsList = [];
        if (eventsData && eventsData.events) {
          eventsList = eventsData.events;
        } else if (Array.isArray(eventsData)) {
          eventsList = eventsData;
        }
        
        setEvents(eventsList);
        console.log('Events loaded:', eventsList.length);
      } catch (error) {
        console.error('Failed to load events:', error);
        setEventError('Failed to load events. Using sample data instead.');
        // Fall back to sample events if API fails
        setEvents([
          { id: 1, name: 'Annual Budget Planning' },
          { id: 2, name: 'Product Launch' },
          { id: 3, name: 'Office Relocation' }
        ]);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);
  
  // Make sure to initialize the raci state properly at the beginning of your component
  const [raci, setRaci] = useState({
    tasks: [
      { id: '1', name: '', assignments: [] },
      { id: '2', name: '', assignments: [] },
      { id: '3', name: '', assignments: [] },
      { id: '4', name: '', assignments: [] }
    ],
    users: []
  });

  // Define tasks for RACI matrix with blank names initially
  const [tasks, setTasks] = useState([
    { id: 1, name: '', responsible: [], accountable: [], consulted: [], informed: [] },
    { id: 2, name: '', responsible: [], accountable: [], consulted: [], informed: [] },
    { id: 3, name: '', responsible: [], accountable: [], consulted: [], informed: [] },
    { id: 4, name: '', responsible: [], accountable: [], consulted: [], informed: [] },
    { id: 5, name: '', responsible: [], accountable: [], consulted: [], informed: [] },
  ]);

  // Financial limits state
  const [financialLimits, setFinancialLimits] = useState({});

  // Add this state for financial limit values
  const [financialLimitValues, setFinancialLimitValues] = useState({});

  // Add this state for selected employees (single selection per role per task)
  const [selectedEmployees, setSelectedEmployees] = useState({
    responsible: {},
    accountable: {},
    consulted: {},
    informed: {}
  });

  // NEW: toggle to allow the same employee in multiple roles for the same task
  const [allowMultipleRolesPerTask, setAllowMultipleRolesPerTask] = useState(false);

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add this state for tracking dropdown refresh
  const [dropdownRefreshKey, setDropdownRefreshKey] = useState(0);

  // Add new state for subtasks and approval status
  const [selectedSubtask, setSelectedSubtask] = useState('');
  const [taskApprovalStatus, setTaskApprovalStatus] = useState({});
  const [subtasks, setSubtasks] = useState({});

  // Add new state for selected task
  const [selectedTask, setSelectedTask] = useState('');
  const [eventTasks, setEventTasks] = useState([]);

  // Add taskAssignments state at the top of your component
  const [taskAssignments, setTaskAssignments] = useState([]);

  // Enhanced function to process employee data consistently with better console logging
  const formatEmployeeData = (employee) => {
    // Create a well-formed employee object
    return {
      id: String(employee.id || '0'),
      name: employee.name || employee.fullName || 'Unknown User',
      role: employee.designation || employee.role || employee.title || '',
      email: employee.email || '',
      department: employee.department?.name || employee.departmentName || ''
    };
  };

  // Add a function to handle task deletion
  const deleteTask = (taskId) => {
    // Update the raci state
    setRaci(prevRaci => {
      // Filter out the task with the given ID
      const updatedTasks = prevRaci.tasks.filter(task => task.id !== String(taskId));
      return {
        ...prevRaci,
        tasks: updatedTasks
      };
    });
    
    // Update the tasks state
    setTasks(prevTasks => {
      // Filter out the task with the given ID
      return prevTasks.filter(task => task.id !== taskId);
    });
    
    // Also clear any selections for this task to prevent orphaned references
    setSelectedEmployees(prev => {
      const newSelections = { ...prev };
      // Remove task references from each role
      Object.keys(newSelections).forEach(role => {
        if (newSelections[role][taskId]) {
          const { [taskId]: _, ...rest } = newSelections[role];
          newSelections[role] = rest;
        }
      });
      return newSelections;
    });
  };

  // Fix: Save all financial limits for all employees per role per task in the payload

  const saveRaciMatrix = async () => {
    if (!selectedEvent) {
      setError('Please select an event first');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      console.log('Preparing RACI matrix for event:', selectedEvent);
      console.log('Current financial limits state:', financialLimits);
      console.log('Financial limit values:', financialLimitValues);

      // Build the payload with the correct API structure
      const payload = {
        eventId: selectedEvent,
        taskAssignments: tasks.map(task => {
          const taskAssignment = {
            taskId: task.id,
            responsible: [],
            accountable: [],
            consulted: [],
            informed: [],
            financialLimits: {} // Using correct format per API docs
          };

          // Process each RACI role for this task
          ['responsible', 'accountable', 'consulted', 'informed'].forEach(role => {
            // Get users for this role
            const rawUserId = selectedEmployees[role][task.id];
            const userIdNum = rawUserId ? parseInt(rawUserId, 10) : NaN;
            if (!isNaN(userIdNum)) {
              taskAssignment[role].push(userIdNum);
              
              // Check for financial limits for all roles
              const key = `${role}-${task.id}-${userIdNum}`;
              
              // Always create a financial limit entry for each role
              const formattedKey = `task-${task.id}-${role}-${userIdNum}`;
              let limitValue = 0;
              
              // Check if financial limit is enabled and has a value
              if (financialLimits[key] && financialLimitValues[key] !== undefined && financialLimitValues[key] !== '') {
                limitValue = Number(financialLimitValues[key]) || 0;
                
                // Create the financial limit object with min/max values
                taskAssignment.financialLimits[formattedKey] = {
                  min: 0, // Starting value
                  max: limitValue, // Maximum limit
                  value: limitValue, // Also include the direct value for compatibility
                  role: role, // Include role for better tracking
                  userId: userIdNum, // Include userId for better tracking
                  enabled: true, // Explicitly mark as enabled
                  type: role // Add role type for better tracking
                };
                
                console.log(`Added financial limit for ${role} ${userIdNum} on task ${task.id}: min=0, max=${limitValue}, value=${limitValue}`);
              } else {
                // Even if financial limit is not enabled, create an entry with default values
                taskAssignment.financialLimits[formattedKey] = {
                  min: 0,
                  max: 0,
                  value: 0,
                  role: role,
                  userId: userIdNum,
                  enabled: false,
                  type: role
                };
                
                console.log(`Added default financial limit for ${role} ${userIdNum} on task ${task.id}`);
              }
              
              // Add role-specific data for consulted and informed
              if (role === 'consulted' || role === 'informed') {
                taskAssignment.financialLimits[formattedKey] = {
                  ...taskAssignment.financialLimits[formattedKey],
                  notificationPreference: 'email', // Add default notification preference
                  canViewFinancials: true, // Add permission flag
                  lastNotified: new Date().toISOString() // Add timestamp
                };
              }

              /* -------- handle extra hierarchical limits for this role */
              const extraRows = extraFinancialLimits[`${role}-${task.id}`] || [];
              let runningMin = limitValue; // next rows min starts from last max
              extraRows.forEach((row, idx) => {
                const extraUidNum = parseInt(row.userId, 10);
                const amt = Number(row.amount);
                if (!extraUidNum || isNaN(amt)) return; // skip incomplete rows

                if (!taskAssignment[role].includes(extraUidNum)) {
                  taskAssignment[role].push(extraUidNum);
                }

                const eKey = `task-${task.id}-${role}-${extraUidNum}`;
                
                taskAssignment.financialLimits[eKey] = {
                  min: runningMin,
                  max: amt,
                  value: amt,
                  role,
                  userId: extraUidNum,
                  enabled: true,
                  hierarchyIndex: idx + 1
                };

                runningMin = amt; // next tier starts from here
              });
            }
          });

          return taskAssignment;
        })
      };

      console.log('RACI Matrix payload:', JSON.stringify(payload, null, 2));

      // Make API request to save RACI matrix
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/raci-matrices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = `Failed to save RACI matrix: ${response.status}`;
        try {
          const errorBody = await response.text();
          console.error('Error response from API:', errorBody);
          try {
            const errorData = JSON.parse(errorBody);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            if (errorBody && errorBody.trim()) {
              errorMessage = `Error: ${errorBody.trim()}`;
            }
          }
        } catch (e) {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('RACI matrix saved successfully:', data);
      
      setSuccess('RACI matrix saved successfully!');
      
      // Reload the RACI matrix data to show updated values
      await loadExistingRaciMatrix(selectedEvent);
      
    } catch (error) {
      console.error('Error saving RACI matrix:', error);
      setError(error.message || 'Failed to save RACI matrix. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Add the missing handleApprovalSubmit function
  const handleApprovalSubmit = async () => {
    if (!approvalEmail || !approvalEmail.trim()) {
      alert('Please enter a valid email for the approver');
      return;
    }

    try {
      // Prepare the approval request payload
      const approvalPayload = {
        eventId: selectedEvent,
        approverEmail: approvalEmail.trim(),
        matrixStatus: 'PENDING_APPROVAL' 
      };

      console.log('Submitting for approval:', approvalPayload);

      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/raci-matrices/submit-approval`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalPayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to submit for approval: ${response.status}`);
      }

      const result = await response.json();
      setSuccess('RACI matrix submitted for approval successfully!');
      setShowApprovalModal(false);
      
    } catch (error) {
      console.error('Error submitting for approval:', error);
      alert(`Failed to submit for approval: ${error.message}`);
    }
  };

  // Add this function at the top level of your component
  const initializeAuth = async () => {
    try {
      // Try localStorage first, then sessionStorage
      let token = localStorage.getItem('raci_auth_token') || sessionStorage.getItem('raci_auth_token');
      let currentCompanyId = localStorage.getItem('raci_company_id') || sessionStorage.getItem('raci_company_id');

      if (!token) {
        console.error('No auth token found');
        return { token: null, companyId: null };
      }

      // If token was in sessionStorage but not localStorage, copy it to localStorage
      if (!localStorage.getItem('raci_auth_token')) {
        localStorage.setItem('raci_auth_token', token);
      }

      // Get user data and company ID if we don't have it
      if (!currentCompanyId) {
        const userResponse = await fetch(`${env.apiBaseUrl}/auth/current-user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user details: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        if (userData.company?.id) {
          localStorage.setItem('raci_company_id', userData.company.id);
          sessionStorage.setItem('raci_company_id', userData.company.id);
          currentCompanyId = userData.company.id;
        }
      }

      return { token, companyId: currentCompanyId };
    } catch (error) {
      console.error('Error initializing auth:', error);
      return { token: null, companyId: null };
    }
  };

  const loadExistingRaciMatrix = async (eventId) => {
    if (!eventId) return;
    
    try {
      setIsLoadingRaciData(true);
      setLoadingEmployees(true);
      
      const token = localStorage.getItem('raci_auth_token') || sessionStorage.getItem('raci_auth_token');
      let currentCompanyId = localStorage.getItem('raci_company_id') || sessionStorage.getItem('raci_company_id');
      
      if (!token) {
        console.error('No auth token found');
        setError('Authentication token not found. Please log in again.');
        return;
      }
      
      if (!currentCompanyId) {
        // Try to get company ID from user profile
        try {
          const userResponse = await fetch(`${env.apiBaseUrl}/auth/current-user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData?.company?.id) {
              currentCompanyId = userData.company.id;
              localStorage.setItem('raci_company_id', currentCompanyId);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      
      if (!currentCompanyId) {
        setError('Company ID not found. Please log in again.');
        return;
      }
      
      console.log('Loading RACI matrix for event:', eventId);
      
      // First try to get event details
      const eventResponse = await fetch(`${env.apiBaseUrl}/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        console.log('Event data:', eventData);
        
        // If event has tasks, use them
        if (eventData.tasks && Array.isArray(eventData.tasks)) {
          setTasks(eventData.tasks.map(task => ({
        id: task.id,
        name: task.name || '',
        description: task.description || '',
            status: task.status || 'not_started',
          responsible: [],
          accountable: [],
          consulted: [],
          informed: []
          })));
        }
      }
      
      /* ------------------------------------------------------------------
         Retrieve existing RACI matrix for the event
         The current backend exposes the data at
         GET /events/{eventId}/raci-matrix. We will call that endpoint and
         gracefully handle the 404 (no matrix yet) and 501 (endpoint not
         implemented) cases, falling back to any cached version stored in
         localStorage (same behaviour as the reference implementation).
      ------------------------------------------------------------------*/

      const raciResponse = await fetch(`${env.apiBaseUrl}/events/${eventId}/raci-matrix`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      // If the endpoint is not yet available, try localStorage cache
      if (raciResponse.status === 501) {
        console.log('RACI matrix API not implemented, checking localStorage cache…');
        const cached = localStorage.getItem(`raci_matrix_${eventId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            populateRaciMatrixFromAPI(parsed);
            setExistingDataFound(true);
          } catch (e) {
            console.error('Failed to parse cached RACI matrix:', e);
            setExistingDataFound(false);
          }
        } else {
          setExistingDataFound(false);
        }
        return;
      }
      
      if (!raciResponse.ok) {
        // A 404 simply means no matrix exists yet for this event
        if (raciResponse.status === 404) {
          console.log('No existing RACI data found for event:', eventId);
          setExistingDataFound(false);
          return;
        }
        throw new Error(`Failed to load RACI matrix: ${raciResponse.status}`);
      }
      
      const raciData = await raciResponse.json();
      console.log('Retrieved RACI matrix:', raciData);
      
      if (raciData) {
        populateRaciMatrixFromAPI(raciData);
        setExistingDataFound(true);
      }

    } catch (error) {
      console.error('Error loading RACI matrix:', error);
      setError(error.message || 'Failed to load RACI matrix');
      setExistingDataFound(false);
    } finally {
      setLoadingEmployees(false);
      setIsLoadingRaciData(false);
    }
  };

  // Add handler for task selection
  const handleTaskChange = (e) => {
    setSelectedTask(e.target.value);
    // Reset subtask selection when task changes
    setSelectedSubtask('');
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

  // Add a helper function to check if an employee is already assigned to any role for a specific task
  const isEmployeeAssignedElsewhere = (taskId, currentRole, employeeId) => {
    // If the user allows duplicates, we never treat the employee as "assigned elsewhere"
    if (allowMultipleRolesPerTask || !employeeId) return false;
    
    const roles = ['responsible', 'accountable', 'consulted', 'informed'];
    return roles
      .filter(role => role !== currentRole)
      .some(role => selectedEmployees[role][taskId] === employeeId);
  };

  // Update handleEmployeeSelect to remove employee from other roles if selected
  const handleEmployeeSelect = (taskId, role, userId) => {
    const updatedSelections = { ...selectedEmployees };
    
    // When duplicates are NOT allowed, ensure uniqueness by removing the
    // employee from other roles for the same task.
    if (!allowMultipleRolesPerTask && userId) {
      const roles = ['responsible', 'accountable', 'consulted', 'informed'];
      roles.forEach(otherRole => {
        if (otherRole !== role && updatedSelections[otherRole][taskId] === userId) {
          delete updatedSelections[otherRole][taskId];
        }
      });
    }
    
    updatedSelections[role] = {
      ...updatedSelections[role],
      [taskId]: userId
    };
    
    setSelectedEmployees(updatedSelections);
  };

  // When the toggle is switched from true -> false, clean any duplicates so
  // each employee appears at most once per task (keeps the first role found).
  useEffect(() => {
    if (!allowMultipleRolesPerTask) {
      const roles = ['responsible', 'accountable', 'consulted', 'informed'];
      const cleaned = { responsible: {}, accountable: {}, consulted: {}, informed: {} };

      // Build per-task maps to track first occurrence
      const perTaskUserSeen = {};

      roles.forEach(role => {
        Object.entries(selectedEmployees[role] || {}).forEach(([taskId, userId]) => {
          if (!userId) return;
          if (!perTaskUserSeen[taskId]) perTaskUserSeen[taskId] = new Set();

          if (!perTaskUserSeen[taskId].has(userId)) {
            cleaned[role][taskId] = userId; // keep
            perTaskUserSeen[taskId].add(userId);
          }
          // else duplicate => skip (effectively removed)
        });
      });

      // Only update state if something actually changed
      const changed = JSON.stringify(cleaned) !== JSON.stringify(selectedEmployees);
      if (changed) setSelectedEmployees(cleaned);
    }
  }, [allowMultipleRolesPerTask]);

  // Update the handleFinancialLimitChange to handle min-max range
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

  const toggleFinancialLimit = (taskId, userId, role) => {
    const key = `${role}-${taskId}-${userId}`;
    console.log('Toggling financial limit for:', key);
    
    setFinancialLimits(prev => {
      const newState = {
        ...prev,
        [key]: !prev[key]
      };
      
      // If turning on a financial limit and no value is set, check DB value first
      if (newState[key] && !financialLimitValues[key]) {
        // Try to fetch from API if needed, otherwise initialize with reasonable default
        // For now, we'll use existing values or initialize with empty string (to show placeholder)
        setFinancialLimitValues(prevValues => ({
          ...prevValues,
          [key]: prevValues[key] || ''
        }));
      }
      
      console.log('New financial limits state:', newState);
      return newState;
    });
  };

  // Add a new function to properly extract financial limits from API response
  const extractFinancialLimitsFromRaciData = (raciData) => {
    const financialLimitMap = {};
    const financialLimitValueMap = {};
    
    if (!raciData || !raciData.tasks) return { financialLimitMap, financialLimitValueMap };
    
    raciData.tasks.forEach(task => {
      if (!task.raci) return;
      
      const taskId = String(task.id);
      
      // Process each RACI role for this task
      Object.keys(task.raci).forEach(role => {
        if (!Array.isArray(task.raci[role]) || task.raci[role].length === 0) return;
        
        task.raci[role].forEach(user => {
          if (!user || !user.id) return;
          
          const userId = String(user.id);
          
          // Check if this user has financial limits defined
          if (user.financialLimits && typeof user.financialLimits === 'object') {
            const key = `${role}-${taskId}-${userId}`;
            financialLimitMap[key] = true;
            
            // Extract the financial limit value prioritizing max value
            if (user.financialLimits.max !== undefined) {
              financialLimitValueMap[key] = String(user.financialLimits.max);
            } else if (user.financialLimits.value !== undefined) {
              financialLimitValueMap[key] = String(user.financialLimits.value);
            } else if (user.financialLimits.min !== undefined) {
              financialLimitValueMap[key] = String(user.financialLimits.min);
            }
            
            console.log(`Found financial limit for ${role} ${userId} on task ${taskId}: ${financialLimitValueMap[key]}`);
          }
        });
      });
    });
    
    return { financialLimitMap, financialLimitValueMap };
  };

  // Update the raci state with the new task
  const addNewTaskToRaci = (task) => {
    setRaci(prevRaci => {
      const updatedTasks = [...prevRaci.tasks, task];
      return {
        ...prevRaci,
        tasks: updatedTasks
      };
    });
  };

  // Fix the saveTaskEdit function to work with both the raci and tasks state structures
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

  // Fix the addNewTask function to also update the tasks state
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
      
      console.log('New task to add:', newRaciTask);
      
      // Update both state objects
      setRaci(prevRaci => {
        console.log('Previous RACI state:', prevRaci);
        const updatedRaci = {
          ...prevRaci,
          tasks: [...(prevRaci.tasks || []), newRaciTask]
        };
        console.log('Updated RACI state:', updatedRaci);
        return updatedRaci;
      });
      
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks, newTask];
        console.log('Updated tasks state:', updatedTasks);
        return updatedTasks;
      });
      
      // Start editing the new task immediately
      setTimeout(() => {
        startEditingTask(newTask);
      }, 10);
      
    } catch (error) {
      console.error('Error adding new task:', error);
    }
  };

  // Remove the redundant useEffect that makes additional API calls
  // Comment out or remove the useEffect that starts with:
  // useEffect(() => {
  //   if (selectedEvent) {
  //     const fetchEventEmployees = async () => {
  //     ...
  //   }
  // }, [selectedEvent]);
  
  // Updated getDisplayEmployees function to prioritize event employees more strictly
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
    // This ensures only event-specific employees appear
    return [];
  };

  // Modify the employee display component for all dropdown selects
  // This function creates a consistent formatted option for employees
  const renderEmployeeOption = (emp) => {
    return (
      <option key={emp.id} value={emp.id}>
        {/* Enhanced display format for employee names */}
        {emp.name || 'Unknown'} 
        {emp.email ? ` (${emp.email})` : ''} 
        {emp.department ? ` - ${emp.department}` : emp.role ? ` - ${emp.role}` : ''}
      </option>
    );
  };

  // Modify the renderRACIMatrix function
  const renderRACIMatrix = () => {
    if (!selectedEvent) {
      return (
        <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p>Select an event and add tasks to create a RACI matrix</p>
        </div>
      );
    }

    // Use tasks if no taskAssignments are available yet
    const displayTasks = taskAssignments.length > 0 ? taskAssignments : tasks;

    // Group tasks by subtask
    const tasksBySubtask = displayTasks.reduce((acc, task) => {
      const subtask = task.subtask || 'Uncategorized';
      if (!acc[subtask]) {
        acc[subtask] = [];
      }
      acc[subtask].push(task);
      return acc;
    }, {});

    // Get tasks to display based on subtask selection
    const tasksToDisplay = selectedSubtask 
      ? tasksBySubtask[selectedSubtask] || []
      : displayTasks;

    return (
      <div className="space-y-6">
        {/* Subtask Selection */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subtask Category
              </label>
              <select
                value={selectedSubtask}
                onChange={handleSubtaskChange}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">All Tasks</option>
                {Object.keys(tasksBySubtask).map(subtask => (
                  <option key={subtask} value={subtask}>
                    {subtask} ({tasksBySubtask[subtask].length} tasks)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* RACI Matrix Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Tasks
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-red-50">
                    <div>Responsible (R)</div>
                    <div className="text-xs font-normal mt-1 text-gray-400">Does the work</div>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-blue-50">
                    <div>Accountable (A)</div>
                    <div className="text-xs font-normal mt-1 text-gray-400">Accountable for the work</div>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-green-50">
                    <div>Consulted (C)</div>
                    <div className="text-xs font-normal mt-1 text-gray-400">Provides input</div>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-yellow-50">
                    <div>Informed (I)</div>
                    <div className="text-xs font-normal mt-1 text-gray-400">Receives updates</div>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                    <div>Send for Approval</div>
                    <div className="text-xs font-normal mt-1 text-gray-400">Submit task for review</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasksToDisplay.map((task, index) => (
                  <tr key={task.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {/* Task Name Cell */}
                    <td className="px-3 py-4 text-sm text-gray-900 border-r">
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-medium mr-2">
                          {index + 1}
                        </span>
                        <span className="font-medium">{task.name || 'Unnamed Task'}</span>
                      </div>
                      {task.subtask && (
                        <div className="mt-1 text-xs text-gray-500">
                          Subtask: {task.subtask}
                        </div>
                      )}
                    </td>

                    {/* Responsible Cell */}
                    <td className="px-3 py-4 text-sm border-r">
                      <div className="flex flex-col space-y-2">
                        <select
                          key={`responsible-${task.id}-${dropdownRefreshKey}`}
                          value={selectedEmployees.responsible[task.id] || ''}
                          onChange={(e) => handleEmployeeSelect(task.id, 'responsible', e.target.value)}
                          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Employee</option>
                          {getDisplayEmployees().map(emp => (
                            <option 
                              key={emp.id} 
                              value={emp.id}
                              disabled={isEmployeeAssignedElsewhere(task.id, 'responsible', emp.id)}
                            >
                              {emp.name}
                            </option>
                          ))}
                        </select>
                        {selectedEmployees.responsible[task.id] && (
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={financialLimits[`responsible-${task.id}-${selectedEmployees.responsible[task.id]}`] || false}
                                onChange={() => toggleFinancialLimit(task.id, selectedEmployees.responsible[task.id], 'responsible')}
                                className="mr-2"
                              />
                              <span className="text-sm">Financial Limit</span>
                            </label>
                            {financialLimits[`responsible-${task.id}-${selectedEmployees.responsible[task.id]}`] && (
                              <input
                                type="number"
                                min="0"
                                value={financialLimitValues[`responsible-${task.id}-${selectedEmployees.responsible[task.id]}`] || ''}
                                onChange={(e) => handleFinancialLimitChange(task.id, selectedEmployees.responsible[task.id], 'responsible', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm"
                                placeholder="Enter limit"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Accountable Cell */}
                    <td className="px-3 py-4 text-sm border-r">
                      <div className="flex flex-col space-y-2">
                        <select
                          key={`accountable-${task.id}-${dropdownRefreshKey}`}
                          value={selectedEmployees.accountable[task.id] || ''}
                          onChange={(e) => handleEmployeeSelect(task.id, 'accountable', e.target.value)}
                          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Employee</option>
                          {getDisplayEmployees().map(emp => (
                            <option 
                              key={emp.id} 
                              value={emp.id}
                              disabled={isEmployeeAssignedElsewhere(task.id, 'accountable', emp.id)}
                            >
                              {emp.name}
                            </option>
                          ))}
                        </select>
                        {selectedEmployees.accountable[task.id] && (
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={financialLimits[`accountable-${task.id}-${selectedEmployees.accountable[task.id]}`] || false}
                                onChange={() => toggleFinancialLimit(task.id, selectedEmployees.accountable[task.id], 'accountable')}
                                className="mr-2"
                              />
                              <span className="text-sm">Financial Limit</span>
                            </label>
                            {financialLimits[`accountable-${task.id}-${selectedEmployees.accountable[task.id]}`] && (
                              <input
                                type="number"
                                min="0"
                                value={financialLimitValues[`accountable-${task.id}-${selectedEmployees.accountable[task.id]}`] || ''}
                                onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
                                          selectedEmployees.accountable[task.id], 
                                          'accountable', 
                                          e.target.value
                                        )}
                                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm"
                                placeholder="Enter limit"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Consulted Cell */}
                    <td className="px-3 py-4 text-sm border-r">
                      <div className="flex flex-col space-y-2">
                        <select
                          key={`consulted-${task.id}-${dropdownRefreshKey}`}
                          value={selectedEmployees.consulted[task.id] || ''}
                          onChange={(e) => handleEmployeeSelect(task.id, 'consulted', e.target.value)}
                          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Employee</option>
                          {getDisplayEmployees().map(emp => (
                            <option 
                              key={emp.id} 
                              value={emp.id}
                              disabled={isEmployeeAssignedElsewhere(task.id, 'consulted', emp.id)}
                            >
                              {emp.name}
                            </option>
                          ))}
                        </select>
                        {selectedEmployees.consulted[task.id] && (
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={financialLimits[`consulted-${task.id}-${selectedEmployees.consulted[task.id]}`] || false}
                                onChange={() => toggleFinancialLimit(task.id, selectedEmployees.consulted[task.id], 'consulted')}
                                className="mr-2"
                              />
                              <span className="text-sm">Financial Limit</span>
                            </label>
                            {financialLimits[`consulted-${task.id}-${selectedEmployees.consulted[task.id]}`] && (
                              <input
                                type="number"
                                min="0"
                                value={financialLimitValues[`consulted-${task.id}-${selectedEmployees.consulted[task.id]}`] || ''}
                                onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
                                          selectedEmployees.consulted[task.id], 
                                          'consulted', 
                                          e.target.value
                                        )}
                                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm"
                                placeholder="Enter limit"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Informed Cell */}
                    <td className="px-3 py-4 text-sm border-r">
                      <div className="flex flex-col space-y-2">
                        <select
                          key={`informed-${task.id}-${dropdownRefreshKey}`}
                          value={selectedEmployees.informed[task.id] || ''}
                          onChange={(e) => handleEmployeeSelect(task.id, 'informed', e.target.value)}
                          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Employee</option>
                          {getDisplayEmployees().map(emp => (
                            <option 
                              key={emp.id} 
                              value={emp.id}
                              disabled={isEmployeeAssignedElsewhere(task.id, 'informed', emp.id)}
                            >
                              {emp.name}
                            </option>
                          ))}
                        </select>
                        {selectedEmployees.informed[task.id] && (
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={financialLimits[`informed-${task.id}-${selectedEmployees.informed[task.id]}`] || false}
                                onChange={() => toggleFinancialLimit(task.id, selectedEmployees.informed[task.id], 'informed')}
                                className="mr-2"
                              />
                              <span className="text-sm">Financial Limit</span>
                            </label>
                            {financialLimits[`informed-${task.id}-${selectedEmployees.informed[task.id]}`] && (
                              <input
                                type="number"
                                min="0"
                                value={financialLimitValues[`informed-${task.id}-${selectedEmployees.informed[task.id]}`] || ''}
                                onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
                                          selectedEmployees.informed[task.id], 
                                          'informed', 
                                          e.target.value
                                        )}
                                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm"
                                placeholder="Enter limit"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Approval Cell */}
                    <td className="px-3 py-4 text-sm">
                      <button
                        onClick={() => setShowApprovalModal(true)}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Submit for Approval
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Make sure we have a helper function for multi-select dropdowns
  const getMultiSelectValues = (e) => {
    return Array.from(e.target.selectedOptions, option => option.value);
  };

  // Ensure we have a proper function to handle role assignments
  const handleRoleAssignment = (taskId, role, employeeIds) => {
    setTaskAssignments(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          return { ...task, [role]: employeeIds };
        }
        return task;
      });
    });
  };

  // Add a function to clear role assignments
  const handleClearRole = (taskId, role) => {
    setTaskAssignments(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          return { ...task, [role]: [] };
        }
        return task;
      });
    });
  };

  // Add this state declaration at the top of your component
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  // Add this function to fetch employees
  const fetchEmployees = async (departmentId) => {
    try {
      const token = localStorage.getItem('raci_auth_token');
      const url = departmentId 
        ? `${env.apiBaseUrl}/departments/${departmentId}`
        : `${env.apiBaseUrl}/users`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      // Normalize various possible shapes
      let employeesList = [];
      if (departmentId && data.employees) {
        employeesList = data.employees;
      } else if (Array.isArray(data)) {
        employeesList = data;
      } else if (data.users && Array.isArray(data.users)) {
        employeesList = data.users;
      }
      
      // Persist raw list for non-event fallback
      setEmployees(employeesList.map(formatEmployeeData));
      
      console.log('Employees loaded:', employeesList.length);
      setFilteredEmployees(employeesList);
      return employeesList;
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setFilteredEmployees([]);
      return [];
    }
  };

  // Add this to the existing handleEventSelect function to load employees when an event is selected
  const handleEventSelect = async (eventId) => {
    // ...existing code...
    
    try {
      // Find the selected event
      const event = events.find(e => e.id.toString() === eventId.toString());
      if (event) {
        setSelectedEvent(event);
        
        // Fetch employees for this event's department
        if (event.departmentId) {
          await fetchEmployees(event.departmentId);
        } else {
          await fetchEmployees(); // Fetch all employees if no department
        }
        
        // ...rest of your existing code...
      }
    } catch (error) {
      console.error('Error selecting event:', error);
    }
  };
  
  // Add this effect to fetch employees when component mounts
  useEffect(() => {
    // Initialize by fetching all employees
    fetchEmployees();
    
    // ...existing code...
  }, []);

  // Add the missing handleSubmit function
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowApprovalModal(true);
  };

  // Add the missing getEventDetails function
  const getEventDetails = () => {
    if (!selectedEvent) return null;
    return events.find(event => event.id.toString() === selectedEvent.toString());
  };

  // Add new function to handle approval status
  const handleApprovalStatusChange = (taskId, status) => {
    setTaskApprovalStatus(prev => ({
      ...prev,
      [taskId]: status
    }));
  };

  // Add new function to handle subtask selection
  const handleSubtaskChange = (e) => {
    setSelectedSubtask(e.target.value);
  };

  // Add handleEventChange function
  const handleEventChange = async (e) => {
    const eventId = e.target.value;
    console.log('Event selected:', eventId);
    setSelectedEvent(eventId);
    setSelectedTask(''); // Reset selected task when event changes
    
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
      setTaskAssignments([]);
      return;
    }
    
    try {
      setLoadingEmployees(true);
      setIsLoadingRaciData(true);
      
      const token = localStorage.getItem('raci_auth_token');
      const currentCompanyId = localStorage.getItem('raci_company_id');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }

      if (!currentCompanyId) {
        // Try to get company ID from user data
        try {
          const userResponse = await fetch(`${env.apiBaseUrl}/auth/current-user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.company?.id) {
              localStorage.setItem('raci_company_id', userData.company.id);
              setCompanyId(userData.company.id);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      
      // First fetch event details
      const eventResponse = await fetch(`${env.apiBaseUrl}/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!eventResponse.ok) {
        throw new Error(`Failed to fetch event details: ${eventResponse.status}`);
      }
      
      const eventData = await eventResponse.json();
      console.log('Event data:', eventData);
      
      // Process tasks from event data
      if (eventData.tasks && Array.isArray(eventData.tasks)) {
        const formattedTasks = eventData.tasks.map(task => ({
          id: task.id,
          name: task.name || '',
          description: task.description || '',
          status: task.status || 'not_started',
          responsible: [],
          accountable: [],
          consulted: [],
          informed: []
        }));
        setTasks(formattedTasks);
        setEventTasks(formattedTasks);
      }
      
      // Determine if this is a default single-task event (task name == event name)
      const isDefaultSingleTask = () => {
        if (!eventData.tasks || eventData.tasks.length !== 1) return false;
        return (eventData.tasks[0].name || '').trim().toLowerCase() === (eventData.name || '').trim().toLowerCase();
      };

      const defaultEvent = isDefaultSingleTask();
      
      // Employee loading logic
      if (defaultEvent) {
        // Default event: always load entire company employees
        const allUsers = await fetchEmployees();
        const formatted = allUsers.map(formatEmployeeData);
        setEventEmployees(formatted);
      } else {
        if (eventData.employees && Array.isArray(eventData.employees) && eventData.employees.length > 0) {
          // Use employees attached to event
          const formattedEmployees = eventData.employees.map(formatEmployeeData);
          setEventEmployees(formattedEmployees);
        } else if (eventData.department?.id) {
          // Fallback to department employees
          const deptEmps = await fetchDepartmentEmployees(eventData.department.id);
          if (!deptEmps || deptEmps.length === 0) {
            // Ultimately load all company employees
            const allUsers = await fetchEmployees();
            const formatted = allUsers.map(formatEmployeeData);
            setEventEmployees(formatted);
          }
        } else {
          // No department info – fallback to all employees
          const allUsers = await fetchEmployees();
          const formatted = allUsers.map(formatEmployeeData);
          setEventEmployees(formatted);
        }
      }
      
      // Load RACI matrix data (new endpoint)
      const raciResponse = await fetch(`${env.apiBaseUrl}/events/${eventId}/raci-matrix`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (raciResponse.ok) {
        const raciData = await raciResponse.json();
        console.log('RACI data loaded:', raciData);
        populateRaciMatrixFromAPI(raciData);
        setExistingDataFound(true);
      } else {
        console.log('No existing RACI data found for event:', eventId);
        setExistingDataFound(false);
      }
      
    } catch (error) {
      console.error('Error loading event data:', error);
      setEventEmployees([]);
      setEventTasks([]);
      setTaskAssignments([]);
    } finally {
      setLoadingEmployees(false);
      setIsLoadingRaciData(false);
    }
  };

  // Add this function at the top level of your component
  const checkRaciDataExists = async (eventId) => {
    try {
      const token = localStorage.getItem('raci_auth_token');
      if (!token) return false;

      // Try all possible endpoints
      const endpoints = [
        `/events/${eventId}/raci-matrix`,
        `/raci-matrices/event/${eventId}`,
        `/raci-matrices/events/${eventId}`,
        `/raci-matrices?eventId=${eventId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${env.apiBaseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`Found RACI data at ${endpoint}:`, data);
            return true;
          }
        } catch (error) {
          console.warn(`Failed to check ${endpoint}:`, error);
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking RACI data:', error);
      return false;
    }
  };

  // Update the event selection dropdown to show which events have RACI data
  const renderEventOptions = () => {
    return events.map(event => (
      <option key={event.id} value={event.id}>
        {event.name} {event.hasRaciData ? '(Has RACI Data)' : ''}
      </option>
    ));
  };

  // Update populateRaciMatrixFromAPI function to properly set state
  const populateRaciMatrixFromAPI = (raciData) => {
    if (!raciData) return;
    
    console.log('Processing RACI data from API:', raciData);
    
    const newSelections = {
      responsible: {},
      accountable: {},
      consulted: {},
      informed: {}
    };

    const newFinancialLimits = {};
    const newFinancialLimitValues = {};
    const newExtraFinancialLimits = {}; // capture hierarchical tiers
    
    // Handle different response formats
    let tasks = [];
    if (Array.isArray(raciData)) {
      // Handle array format (flat structure)
      const taskMap = new Map();
      raciData.forEach(assignment => {
        const taskId = String(assignment.task_id || assignment.taskId);
        if (!taskId) return;
        
        if (!taskMap.has(taskId)) {
          taskMap.set(taskId, {
            id: taskId,
            name: assignment.task_name || assignment.taskName || '',
            description: assignment.task_description || assignment.taskDescription || '',
            status: assignment.task_status || assignment.taskStatus || 'not_started',
            raci: {
              responsible: [],
              accountable: [],
              consulted: [],
              informed: []
            }
          });
        }
        
        const task = taskMap.get(taskId);
        const role = (assignment.role || '').toLowerCase();
        const userId = String(assignment.user_id || assignment.userId);
        
        if (userId) {
          task.raci[role]?.push({
            id: userId,
            name: assignment.user_name || assignment.userName || 'Unknown',
            email: assignment.user_email || assignment.userEmail
          });
          
          // Handle financial limits
          if (assignment.financial_limit || assignment.financialLimit) {
            const key = `${role}-${taskId}-${userId}`;
            newFinancialLimits[key] = true;
            newFinancialLimitValues[key] = String(assignment.financial_limit_value || assignment.financialLimitValue || 0);
          }
        }
      });
      tasks = Array.from(taskMap.values());
    } else if (raciData.tasks) {
      // Handle object format (nested structure)
      tasks = raciData.tasks;
    }
    
    // Process tasks and update state
    tasks.forEach(task => {
      const taskId = String(task.id);
      
      // Process each RACI role
      ['responsible', 'accountable', 'consulted', 'informed'].forEach(role => {
        const assignments = task.raci?.[role] || [];
        if (assignments.length === 0) return;

        // Sort by min value of financial limits (ascending). If no limits, treat min as 0.
        const sorted = [...assignments].sort((a, b) => {
          const minA = Number(a?.financialLimits?.min ?? 0);
          const minB = Number(b?.financialLimits?.min ?? 0);
          return minA - minB;
        });

        // The first (lowest min) becomes the primary selection
        const primary = sorted[0];
        if (primary && primary.id) {
          const primaryIdStr = String(primary.id);
          newSelections[role][taskId] = primaryIdStr;

          // Record financial limits for primary if present
          if (primary.financialLimits || primary.financial_limits) {
            const fl = primary.financialLimits || primary.financial_limits;
            const fKey = `${role}-${taskId}-${primaryIdStr}`;
            newFinancialLimits[fKey] = true;
            newFinancialLimitValues[fKey] = String(fl.max ?? fl.value ?? fl.amount ?? 0);
          }
        }

        // Remaining assignments become extra hierarchical tiers
        if (sorted.length > 1) {
          const eKey = `${role}-${taskId}`;
          newExtraFinancialLimits[eKey] = [];
          sorted.slice(1).forEach(userObj => {
            if (!userObj || !userObj.id) return;
            const uIdStr = String(userObj.id);

            // Record toggle/value for each userObj
            const fl = userObj.financialLimits || userObj.financial_limits || {};
            const fKey = `${role}-${taskId}-${uIdStr}`;
            newFinancialLimits[fKey] = true;
            newFinancialLimitValues[fKey] = String(fl.max ?? fl.value ?? fl.amount ?? 0);

            newExtraFinancialLimits[eKey].push({ userId: uIdStr, amount: String(fl.max ?? fl.value ?? fl.amount ?? 0) });
          });
        }
      });
    });
    
    // Second pass: if any task contains a flat financialLimits map, parse it to rebuild UI state
    tasks.forEach(task => {
      if (!task.financialLimits || typeof task.financialLimits !== 'object') return;

      Object.entries(task.financialLimits).forEach(([flatKey, limitsObj]) => {
        const parts = flatKey.split('-'); // expected format: role-taskId-userId
        if (parts.length < 3) return;
        const [rolePart, taskPart, userPart] = parts;

        const fKey = `${rolePart}-${taskPart}-${userPart}`;
        newFinancialLimits[fKey] = true;
        const val = limitsObj?.max ?? limitsObj?.value ?? limitsObj?.amount ?? 0;
        newFinancialLimitValues[fKey] = String(val);

        if (!newSelections[rolePart]?.[taskPart]) {
          if (!newSelections[rolePart]) newSelections[rolePart] = {};
          newSelections[rolePart][taskPart] = String(userPart);
        } else if (newSelections[rolePart][taskPart] !== String(userPart)) {
          const eKey = `${rolePart}-${taskPart}`;
          if (!newExtraFinancialLimits[eKey]) newExtraFinancialLimits[eKey] = [];
          newExtraFinancialLimits[eKey].push({ userId: String(userPart), amount: String(val) });
        }
      });
    });
    
    console.log('Populated selections:', newSelections);
    console.log('Financial limits:', newFinancialLimits);
    console.log('Financial limit values:', newFinancialLimitValues);
    
    // Update state
    setSelectedEmployees(newSelections);
    setFinancialLimits(newFinancialLimits);
    setFinancialLimitValues(newFinancialLimitValues);
    setExtraFinancialLimits(newExtraFinancialLimits);
    
    // Update tasks if we have them
    if (tasks.length > 0) {
      setTasks(tasks.map(task => ({
        id: task.id,
        name: task.name || '',
        description: task.description || '',
        status: task.status || 'not_started',
        responsible: task.raci?.responsible || [],
        accountable: task.raci?.accountable || [],
        consulted: task.raci?.consulted || [],
        informed: task.raci?.informed || []
      })));
    }

    // Force refresh dropdowns
    setTimeout(() => {
    setDropdownRefreshKey(prev => prev + 1);
    }, 100);
  };

  // Add useEffect to handle initial matrix setup
  useEffect(() => {
    if (eventEmployees.length > 0 && !isLoadingRaciData) {
      // If we have employees but no existing data, set up empty matrix
      if (!existingDataFound) {
        const emptyMatrix = {
          tasks: tasks.map(task => ({
            id: task.id,
            name: task.name || '',
            description: task.description || '',
            raci: {
              responsible: [],
              accountable: [],
              consulted: [],
              informed: []
            },
            financialLimits: {}
          }))
        };
        populateRaciMatrixFromAPI(emptyMatrix);
      }
    }
  }, [eventEmployees, existingDataFound, isLoadingRaciData]);

  // Update extractEmployeesFromRaciData to handle both formats
  const extractEmployeesFromRaciData = (raciData) => {
    const employeesMap = new Map();
    
    if (Array.isArray(raciData)) {
      // Handle array format from DB
      raciData.forEach(assignment => {
        const userId = String(assignment.user_id || assignment.userId);
        if (userId && !employeesMap.has(userId)) {
          employeesMap.set(userId, {
            id: userId,
            name: assignment.user_name || assignment.userName || 'Unknown',
            email: assignment.user_email || assignment.userEmail || '',
            role: assignment.user_role || assignment.userRole || '',
            department: assignment.department_name || assignment.departmentName || ''
          });
        }
      });
    } else if (raciData?.tasks) {
      // Handle object format
      raciData.tasks.forEach(task => {
        if (!task.raci) return;
        
        ['responsible', 'accountable', 'consulted', 'informed'].forEach(role => {
          if (Array.isArray(task.raci[role])) {
            task.raci[role].forEach(user => {
              if (user && user.id && !employeesMap.has(user.id)) {
                employeesMap.set(user.id, {
                  id: String(user.id),
                  name: user.name || user.fullName || 'Unknown',
                  email: user.email || '',
                  role: user.designation || user.role || '',
                  department: user.department?.name || user.departmentName || ''
                });
              }
            });
          }
        });
      });
    }
    
    return Array.from(employeesMap.values());
  };

  // Add useEffect to load RACI data when event is selected
  useEffect(() => {
    if (selectedEvent) {
      console.log('Selected event changed, loading RACI data for:', selectedEvent);
      loadExistingRaciMatrix(selectedEvent);
    }
  }, [selectedEvent]);

  /* ------------------------------------------------------------------
     EXTRA (HIERARCHICAL) FINANCIAL LIMITS PER ROLE / TASK
     Structure: {
       `${role}-${taskId}`: [ { userId: '', amount: '' }, ... ]
     }
  ------------------------------------------------------------------*/
  const [extraFinancialLimits, setExtraFinancialLimits] = useState({});

  // Helper to add a blank extra limit row
  const addExtraFinancialLimitRow = (taskId, role) => {
    const key = `${role}-${taskId}`;
    setExtraFinancialLimits(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { userId: '', amount: '' }]
    }));
  };

  const updateExtraLimitUser = (taskId, role, idx, userId) => {
    const key = `${role}-${taskId}`;
    setExtraFinancialLimits(prev => {
      const rows = [...(prev[key] || [])];
      rows[idx] = { ...rows[idx], userId };
      return { ...prev, [key]: rows };
    });
  };

  const updateExtraLimitAmount = (taskId, role, idx, amount) => {
    const key = `${role}-${taskId}`;
    let sanitized = amount === '' ? '' : Number(amount) >= 0 ? amount : '0';

    // Enforce hierarchical rule: value must be >= previous tier's max
    const rowsSnapshot = extraFinancialLimits[key] || [];
    let prevMax = 0;
    if (idx === 0) {
      // Primary limit for role (from financialLimitValues)
      const primaryUserId = selectedEmployees[role]?.[taskId];
      const primaryKey = `${role}-${taskId}-${primaryUserId}`;
      if (financialLimitValues[primaryKey]) prevMax = Number(financialLimitValues[primaryKey]);
    } else if (rowsSnapshot[idx - 1]?.amount) {
      prevMax = Number(rowsSnapshot[idx - 1].amount);
    }
    if (sanitized !== '' && Number(sanitized) < prevMax) {
      sanitized = String(prevMax); // auto-correct to hierarchy
    }

    setExtraFinancialLimits(prev => {
      const rows = [...(prev[key] || [])];
      rows[idx] = { ...rows[idx], amount: sanitized };
      return { ...prev, [key]: rows };
    });
  };

  // On duplicate-prevention: determine if employee already chosen within all tiers for same role/task
  const isEmployeeInExtraRows = (taskId, role, employeeId) => {
    const key = `${role}-${taskId}`;
    const rows = extraFinancialLimits[key] || [];
    return rows.some(r => r.userId && r.userId === employeeId);
  };

  // Render helper for extra rows inside cell
  const renderExtraLimitRows = (task, role) => {
    const key = `${role}-${task.id}`;
    const rows = extraFinancialLimits[key] || [];

    return (
      <>
        {rows.map((row, idx) => {
          // Calculate minimum value for this tier
          let minVal = 0;
          if (idx === 0) {
            const primaryUserId = selectedEmployees[role]?.[task.id];
            const primaryKey = `${role}-${task.id}-${primaryUserId}`;
            if (financialLimitValues[primaryKey]) minVal = Number(financialLimitValues[primaryKey]);
          } else {
            minVal = Number(rows[idx - 1]?.amount || 0);
          }
          return (
          <div key={`extra-${key}-${idx}`} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #e5e7eb' }}>
             <select
               value={row.userId}
               onChange={(e) => updateExtraLimitUser(task.id, role, idx, e.target.value)}
               style={{
                 width: '100%',
                 padding: '0.5rem',
                 border: '1px solid #d1d5db',
                 borderRadius: '6px',
                 fontSize: '0.875rem'
               }}
             >
               <option value="">Select Employee</option>
               {getDisplayEmployees().map(emp => {
                 // Exclude if already chosen in primary or other rows
                 const duplicate =
                   (selectedEmployees[role][task.id] && selectedEmployees[role][task.id] === emp.id) ||
                   isEmployeeInExtraRows(task.id, role, emp.id) && row.userId !== emp.id;
                 return (
                   <option key={`emp-${emp.id}`} value={emp.id} disabled={duplicate}>
                     {emp.name}
                   </option>
                 );
               })}
             </select>
             {row.userId && (
               <>
               {/* Display min boundary */}
               <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                 Min: {minVal}
               </div>
               <input
                 type="number"
                 min={minVal}
                 placeholder={`≥ ${minVal}`}
                 value={row.amount}
                 onChange={(e) => updateExtraLimitAmount(task.id, role, idx, e.target.value)}
                 style={{
                   width: '100%',
                   marginTop: '0.25rem',
                   padding: '0.5rem',
                   border: '1px solid #d1d5db',
                   borderRadius: '6px',
                   fontSize: '0.875rem'
                 }}
               />
               </>
             )}
           </div>
          );})}
        {/* Add button */}
        <button
          type="button"
          onClick={() => addExtraFinancialLimitRow(task.id, role)}
          style={{
            marginTop: '0.75rem',
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Add another limit
        </button>
      </>
    );
  };

  // Utility to decide if task dropdown should be hidden
  const hideTaskDropdown = () => {
    if (!selectedEvent) return false;
    if (eventTasks.length !== 1) return false;
    const eventDetail = getEventDetails && getEventDetails();
    if (!eventDetail) return false;
    return eventTasks[0].name === eventDetail.name;
  };

  return (
    <div>
      <div className="page-header">
        <h1>RACI Assignment</h1>
        <p>Create responsibility matrix for events</p>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2>Create RACI Matrix</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Event Selection */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-2">
                Event Selection
              </label>
              <div className="flex items-center gap-4" style={{ maxWidth: '100%' }}>
                <select
                  id="event"
                  name="event"
                  value={selectedEvent}
                  onChange={handleEventChange}
                  required
                  className="form-select block w-full px-3 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  style={{ 
                    flex: '3',
                    marginRight: '1rem',
                    minWidth: '0',
                    maxWidth: '89%'
                  }}
                >
                  <option value="">Select Event</option>
                  {renderEventOptions()}
                </select>
                <button 
                  type="button"
                  className="btn btn-secondary whitespace-nowrap px-4 py-2"
                  style={{ 
                    flex: '1',
                    maxWidth: '150px',
                    minWidth: '120px'
                  }}
                  onClick={() => alert('GPT Enhancement would be shown here')}
                >
                  Know More
                </button>
              </div>
            </div>

            {/* Task Selection - Only show when an event is selected */}
            {selectedEvent && !hideTaskDropdown() && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
                  Task Selection
                </label>
                <div className="flex items-center gap-4" style={{ maxWidth: '100%' }}>
                  <select
                    id="task"
                    name="task"
                    value={selectedTask}
                    onChange={handleTaskChange}
                    className="form-select block w-full px-3 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    style={{ 
                      flex: '3',
                      minWidth: '0',
                      maxWidth: '99%'
                    }}
                  >
                    <option value="">All Tasks</option>
                    {eventTasks.map(task => (
                      <option key={task.id} value={task.id}>
                        {task.name} {task.description ? `- ${task.description}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedTask && (
                    <div className="text-sm text-gray-500" style={{ 
                      flex: '1',
                      maxWidth: '150px',
                      minWidth: '120px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {eventTasks.find(t => t.id.toString() === selectedTask.toString())?.description}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rest of the form content */}
          {isLoadingRaciData ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading RACI data...</p>
            </div>
          ) : selectedEvent ? (
            <>
              <div className="card-section" style={{ margin: '1.5rem 0' }}>
                <h3>Event: {getEventDetails()?.name}</h3>
                {existingDataFound ? (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#ecfdf5', 
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    border: '1px solid #10b981'
                  }}>
                    <p>Existing RACI matrix found for this event. You can review and modify the assignments below.</p>
                  </div>
                ) : (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}>
                    <p>No existing RACI matrix found. Please create new assignments below.</p>
                    <p>Available employees: {getDisplayEmployees().length}</p>
                  </div>
                )}
              </div>
              
              <div className="card fix-card">
                <div className="card-header" style={{ 
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center' // Center the header content
                }}>
                  <h2>RACI Matrix</h2>
                  <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                    R: Responsible - Does the work | A: Accountable - Approves the work | C: Consulted - Provides input | I: Informed - Receives updates
                  </p>
                  {/* Toggle for duplicate-role allowance */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowMultipleRolesPerTask}
                      onChange={(e) => setAllowMultipleRolesPerTask(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Allow same person in multiple roles for a task
                  </label>
                </div>
                
                <div className="raci-matrix-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="raci-matrix" style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed'
                  }}>
                    <thead>
                      <tr>
                        <th style={{ 
                          textAlign: 'left', 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                          width: '16%'
                        }}>Task</th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '16%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#2563eb' }}>Responsible (R)</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Does the work</div>
                        </th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '16%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#059669' }}>Accountable (A)</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Approves the work</div>
                        </th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '16%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#d97706' }}>Consulted (C)</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Provides input</div>
                        </th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '16%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#7c3aed' }}>Informed (I)</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Receives updates</div>
                        </th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '20%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#6b7280' }}>Send for Approval</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Submit task for review</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks
                        .filter(task => !selectedTask || task.id.toString() === selectedTask.toString())
                        .map((task, index) => (
                        <tr key={task.id}>
                          {/* Task Name Cell - Now not editable directly since tasks come from the event */}
                          <td style={{ 
                            padding: '1rem',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            position: 'sticky',
                            left: 0,
                            fontWeight: '500'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#e5e7eb',
                                color: '#4b5563',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                marginRight: '0.75rem',
                                flexShrink: 0
                              }}>
                                {index + 1}
                              </span>
                              <span>
                                {task.name || (
                                  <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                    Unnamed Task
                                  </span>
                                )}
                              </span>
                              {task.description && (
                                <span 
                                  style={{ 
                                    marginLeft: '0.5rem', 
                                    color: '#9ca3af', 
                                    fontSize: '0.75rem'
                                  }}
                                  title={task.description}
                                >
                                  ℹ️
                                </span>
                              )}
                            </div>
                          </td>
                          
                          {/* Responsible Column - keep existing implementation but just change the key */}
                          <td style={{ 
                            padding: '1rem',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            textAlign: 'center'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <select
                                key={`responsible-${task.id}-${dropdownRefreshKey}`}
                                value={selectedEmployees.responsible[task.id] || ''}
                                onChange={(e) => handleEmployeeSelect(task.id, 'responsible', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: selectedEmployees.responsible[task.id] ? '2px solid #2563eb' : '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem'
                                }}
                              >
                                <option value="">Select Employee</option>
                                {loadingEmployees ? (
                                  <option disabled>Loading employees...</option>
                                ) : (
                                  getDisplayEmployees().map((emp, index) => {
                                    const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'responsible', emp.id);
                                    const isSelected = selectedEmployees.responsible[task.id] === emp.id;
                                    return (
                                      <option 
                                        key={`emp-${emp.id}-${index}`} 
                                        value={emp.id}
                                        disabled={isAssignedElsewhere}
                                        style={isSelected 
                                          ? { fontWeight: 'bold', backgroundColor: '#eff6ff' } 
                                          : isAssignedElsewhere 
                                          ? { color: '#9ca3af', fontStyle: 'italic' } 
                                          : {}
                                        }
                                      >
                                        {emp.name || 'Unknown'}
                                        {isSelected ? ' (Selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                                      </option>
                                    );
                                  })
                                )}
                                {!loadingEmployees && getDisplayEmployees().length === 0 && (
                                  <option disabled>No employees available for this event</option>
                                )}
                              </select>

                              {/* Keep existing financial limit UI */}
                              {selectedEmployees.responsible[task.id] && (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  alignItems: 'flex-start'
                                }}>
                                  <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '0.875rem',
                                    color: '#4b5563',
                                    cursor: 'pointer',
                                    width: '100%'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={financialLimits[`responsible-${task.id}-${selectedEmployees.responsible[task.id]}`] || false}
                                      onChange={() => toggleFinancialLimit(task.id, selectedEmployees.responsible[task.id], 'responsible')}
                                      style={{ marginRight: '0.5rem' }}
                                    />
                                    Financial Limit
                                  </label>
                                  
                                  {financialLimits[`responsible-${task.id}-${selectedEmployees.responsible[task.id]}`] && (
                                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="Enter limit amount"
                                        value={financialLimitValues[`responsible-${task.id}-${selectedEmployees.responsible[task.id]}`] || ''}
                                        onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
                                          selectedEmployees.responsible[task.id], 
                                          'responsible', 
                                          e.target.value
                                        )}
                                        
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '6px',
                                          fontSize: '0.875rem'
                                        }}
                                      />
                                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', textAlign: 'left' }}>
                                        Amount in INR
                                      </div>
                                      {/* Extra hierarchical limits */}
                                      {renderExtraLimitRows(task, 'responsible')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Accountable Column - Add proper dropdown */}
                          <td style={{ 
                            padding: '1rem',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            textAlign: 'center'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <select
                                key={`accountable-${task.id}-${dropdownRefreshKey}`}
                                value={selectedEmployees.accountable[task.id] || ''}
                                onChange={(e) => handleEmployeeSelect(task.id, 'accountable', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: selectedEmployees.accountable[task.id] ? '2px solid #059669' : '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  backgroundColor: selectedEmployees.accountable[task.id] ? '#f0fdfa' : 'white'
                                }}
                              >
                                <option value="">Select Employee</option>
                                {loadingEmployees ? (
                                  <option disabled>Loading employees...</option>
                                ) : (
                                  getDisplayEmployees().map((emp, index) => {
                                    const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'accountable', emp.id);
                                    const isSelected = selectedEmployees.accountable[task.id] === emp.id;
                                    return (
                                      <option 
                                        key={`emp-${emp.id}-${index}`} 
                                        value={emp.id}
                                        disabled={isAssignedElsewhere}
                                        style={isSelected 
                                          ? { fontWeight: 'bold', backgroundColor: '#ecfdf5' } 
                                          : isAssignedElsewhere 
                                          ? { color: '#9ca3af', fontStyle: 'italic' } 
                                          : {}
                                        }
                                      >
                                        {emp.name || 'Unknown'}
                                        {isSelected ? ' (Selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                                      </option>
                                    );
                                  })
                                )}
                                {!loadingEmployees && getDisplayEmployees().length === 0 && (
                                  <option disabled>No employees available for this event</option>
                                )}
                              </select>
                              
                              {selectedEmployees.accountable[task.id] && (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  alignItems: 'flex-start'
                                }}>
                                  <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '0.875rem',
                                    color: '#4b5563',
                                    cursor: 'pointer',
                                    width: '100%'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={financialLimits[`accountable-${task.id}-${selectedEmployees.accountable[task.id]}`] || false}
                                      onChange={() => toggleFinancialLimit(task.id, selectedEmployees.accountable[task.id], 'accountable')}
                                      style={{ marginRight: '0.5rem' }}
                                    />
                                    Financial Limit
                                  </label>
                                  
                                  {financialLimits[`accountable-${task.id}-${selectedEmployees.accountable[task.id]}`] && (
                                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="Enter limit amount"
                                        value={financialLimitValues[`accountable-${task.id}-${selectedEmployees.accountable[task.id]}`] || ''}
                                        onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
                                          selectedEmployees.accountable[task.id], 
                                          'accountable', 
                                          e.target.value
                                        )}
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '6px',
                                          fontSize: '0.875rem'
                                        }}
                                      />
                                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', textAlign: 'left' }}>
                                        Amount in INR
                                      </div>
                                      {/* Extra hierarchical limits */}
                                      {renderExtraLimitRows(task, 'accountable')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Consulted Column - Add proper dropdown */}
                          <td style={{ 
                            padding: '1rem',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            textAlign: 'center'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <select
                                key={`consulted-${task.id}-${dropdownRefreshKey}`}
                                value={selectedEmployees.consulted[task.id] || ''}
                                onChange={(e) => handleEmployeeSelect(task.id, 'consulted', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: selectedEmployees.consulted[task.id] ? '2px solid #d97706' : '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  backgroundColor: selectedEmployees.consulted[task.id] ? '#fef3c7' : 'white'
                                }}
                              >
                                <option value="">Select Employee</option>
                                {loadingEmployees ? (
                                  <option disabled>Loading employees...</option>
                                ) : (
                                  getDisplayEmployees().map((emp, index) => {
                                    const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'consulted', emp.id);
                                    const isSelected = selectedEmployees.consulted[task.id] === emp.id;
                                    return (
                                      <option 
                                        key={`emp-${emp.id}-${index}`} 
                                        value={emp.id}
                                        disabled={isAssignedElsewhere}
                                        style={isSelected 
                                          ? { fontWeight: 'bold', backgroundColor: '#fef3c7' } 
                                          : isAssignedElsewhere 
                                          ? { color: '#9ca3af', fontStyle: 'italic' } 
                                          : {}
                                        }
                                      >
                                        {emp.name || 'Unknown'}
                                        {isSelected ? ' (Selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                                      </option>
                                    );
                                  })
                                )}
                                {!loadingEmployees && getDisplayEmployees().length === 0 && (
                                  <option disabled>No employees available for this event</option>
                                )}
                              </select>
                              
                              {selectedEmployees.consulted[task.id] && (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  alignItems: 'flex-start'
                                }}>
                                  <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '0.875rem',
                                    color: '#4b5563',
                                    cursor: 'pointer',
                                    width: '100%'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={financialLimits[`consulted-${task.id}-${selectedEmployees.consulted[task.id]}`] || false}
                                      onChange={() => toggleFinancialLimit(task.id, selectedEmployees.consulted[task.id], 'consulted')}
                                      style={{ marginRight: '0.5rem' }}
                                    />
                                    Financial Limit
                                  </label>
                                  
                                  {financialLimits[`consulted-${task.id}-${selectedEmployees.consulted[task.id]}`] && (
                                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="Enter limit amount"
                                        value={financialLimitValues[`consulted-${task.id}-${selectedEmployees.consulted[task.id]}`] || ''}
                                        onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
                                          selectedEmployees.consulted[task.id], 
                                          'consulted', 
                                          e.target.value
                                        )}
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '6px',
                                          fontSize: '0.875rem'
                                        }}
                                      />
                                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', textAlign: 'left' }}>
                                        Amount in INR
                                      </div>
                                      {/* Extra hierarchical limits */}
                                      {renderExtraLimitRows(task, 'consulted')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Informed Column - Add proper dropdown */}
                          <td style={{ 
                            padding: '1rem',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            textAlign: 'center'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <select
                                key={`informed-${task.id}-${dropdownRefreshKey}`}
                                value={selectedEmployees.informed[task.id] || ''}
                                onChange={(e) => handleEmployeeSelect(task.id, 'informed', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: selectedEmployees.informed[task.id] ? '2px solid #7c3aed' : '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  backgroundColor: selectedEmployees.informed[task.id] ? '#f5f3ff' : 'white'
                                }}
                              >
                                <option value="">Select Employee</option>
                                {loadingEmployees ? (
                                  <option disabled>Loading employees...</option>
                                ) : (

                                  getDisplayEmployees().map((emp, index) => {
                                    const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'informed', emp.id);
                                    const isSelected = selectedEmployees.informed[task.id] === emp.id;
                                    return (
                                      <option 
                                        key={`emp-${emp.id}-${index}`} 
                                        value={emp.id}
                                        disabled={isAssignedElsewhere}
                                        style={isSelected 
                                          ? { fontWeight: 'bold', backgroundColor: '#f5f3ff' } 
                                          : isAssignedElsewhere 
                                          ? { color: '#9ca3af', fontStyle: 'italic' } 
                                          : {}
                                        }
                                      >
                                        {emp.name || 'Unknown'}
                                        {isSelected ? ' (Selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                                      </option>
                                    );
                                  })
                                )}
                                {!loadingEmployees && getDisplayEmployees().length === 0 && (
                                  <option disabled>No employees available for this event</option>
                                )}
                              </select>
                              
                              {selectedEmployees.informed[task.id] && (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  alignItems: 'flex-start'
                                }}>
                                  <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '0.875rem',
                                    color: '#4b5563',
                                    cursor: 'pointer',
                                    width: '100%'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={financialLimits[`informed-${task.id}-${selectedEmployees.informed[task.id]}`] || false}
                                      onChange={() => toggleFinancialLimit(task.id, selectedEmployees.informed[task.id], 'informed')}
                                      style={{ marginRight: '0.5rem' }}
                                    />
                                    Financial Limit
                                  </label>
                                  
                                  {financialLimits[`informed-${task.id}-${selectedEmployees.informed[task.id]}`] && (
                                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="Enter limit amount"
                                        value={financialLimitValues[`informed-${task.id}-${selectedEmployees.informed[task.id]}`] || ''}
                                        onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
                                          selectedEmployees.informed[task.id], 
                                          'informed', 
                                          e.target.value
                                        )}
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '6px',
                                          fontSize: '0.875rem'
                                        }}
                                      />
                                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', textAlign: 'left' }}>
                                        Amount in INR
                                      </div>
                                      {/* Extra hierarchical limits */}
                                      {renderExtraLimitRows(task, 'informed')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Add new Approval Status column */}
                          <td className="whitespace-nowrap text-sm text-gray-500 bg-purple-50" style={{
                            borderBottom: '1px solid #e5e7eb',
                            borderLeft: '1px solid #e5e7eb',
                            padding: '1rem'
                          }}>
                            <button
                              onClick={() => setShowApprovalModal(true)}
                              className="btn btn-primary"
                              style={{
                                transition: 'all 0.2s',
                                maxWidth: '90%',
                                padding: '0.25rem 0.75rem', // Smaller padding
                                fontSize: '0.875rem', // Smaller font size
                                height: '40px', // Fixed small height
                                lineHeight: '1', // Tighter line height
                                // margin: '0 auto',
                                // maxHeight: '20%',
                              }}
                            >
                              Submit for Approval
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={{ 
                  marginTop: '1.5rem',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '1rem'
                }}>
                  <button
                    type="button"
                    onClick={saveRaciMatrix}
                    disabled={saving}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: saving ? '#94a3b8' : '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? 'Saving...' : existingDataFound ? 'Update RACI Matrix' : 'Save RACI Matrix'}
                  </button>
                </div>
              </div>
            </>
          ) : null}
          
          <div className="form-actions">
            {/* <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!selectedEvent}
            >
              Submit for Approvals
            </button> */}
          </div>
        </form>
      </div>
      
      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="meeting-modal">
          <div className="modal-backdrop" onClick={() => setShowApprovalModal(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Submit for Approval</h3>
            </div>
            <div className="modal-body">
              <p>Select employees who should approve this RACI matrix:</p>
              <div className="form-group">
                <div style={{ marginBottom: '1rem' }}>
                  <select
                    value={approvalEmail}
                    onChange={(e) => {
                      const selectedEmployee = getDisplayEmployees().find(emp => emp.email === e.target.value);
                      if (selectedEmployee) {
                        setApprovalEmail(prev => {
                          // If email already exists, don't add it again
                          if (prev.includes(selectedEmployee.email)) return prev;
                          return prev ? `${prev}, ${selectedEmployee.email}` : selectedEmployee.email;
                        });
                      }
                    }}
                    style={{ 
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <option value="">Select an employee</option>
                    {getDisplayEmployees().map((emp) => (
                      <option key={emp.id} value={emp.email}>
                        {emp.name} ({emp.email}) - {emp.role || emp.department || 'No role'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Selected Approvers:</label>
                  <input
                    type="text"
                    value={approvalEmail}
                    onChange={(e) => setApprovalEmail(e.target.value)}
                    placeholder="Selected approvers will appear here"
                    required
                    style={{ 
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      marginTop: '0.5rem',
                      backgroundColor: '#f9fafb'
                    }}
                  />
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280', 
                    marginTop: '0.5rem' 
                  }}>
                    Selected emails will be comma-separated. You can also manually edit the list.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowApprovalModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleApprovalSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fix the broken style tag */}
      <style>{`
        .raci-matrix-wrapper {
          width: 100%;
          margin-bottom: 1rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .raci-matrix {
          width: 100%;
          border-collapse: collapse;
        }
        
        .raci-matrix th, .raci-matrix td {
          padding: 1rem;
          vertical-align: top;
          word-wrap: break-word;
        }
        
        .raci-matrix th {
          position: sticky;
          top: 0;
          background-color: #f9fafb;
          z-index: 10;
        }
        
        @media (max-width: 1024px) {
          .raci-matrix-wrapper {
            overflow-x: auto;
          }
          .raci-matrix {
            min-width: 1024px;
          }
        }
      `}</style>
    </div>
  );
};

export default RACIAssignment;
