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
  
  // Fetch company ID and then employees
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user's company ID
        const token = localStorage.getItem('raci_auth_token');
        
        // Try first with the /users/me endpoint
        try {
          const userResponse = await fetch(`${env.apiBaseUrl}/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData && userData.company && userData.company.id) {
              setCompanyId(userData.company.id);
              fetchCompanyEmployees(userData.company.id, token);
              return;
            }
          }
          
          // If /users/me fails, try with /auth/current-user endpoint
          const authResponse = await fetch(`${env.apiBaseUrl}/auth/current-user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData && authData.company && authData.company.id) {
              setCompanyId(authData.company.id);
              fetchCompanyEmployees(authData.company.id, token);
              return;
            }
          }
          
          throw new Error('Could not retrieve company information');
        } catch (error) {
          console.error('Error fetching user profile:', error);
          
          // As a last resort, check if we have companyId in localStorage
          const storedCompanyId = localStorage.getItem('raci_company_id');
          if (storedCompanyId) {
            setCompanyId(storedCompanyId);
            fetchCompanyEmployees(storedCompanyId, token);
            return;
          }
          
          throw new Error('Could not determine company from user profile');
        }
      } catch (error) {
        console.error('Error fetching user or company data:', error);
        setEmployeeError('Failed to identify company. Using sample data instead.');
        // Fall back to sample employees
        setEmployees([
          { id: 1, name: 'Alice Brown', role: 'Finance Manager' },
          { id: 2, name: 'Bob White', role: 'Marketing Director' },
          { id: 3, name: 'Charlie Green', role: 'Product Manager' },
          { id: 4, name: 'Diana Black', role: 'HR Manager' },
          { id: 5, name: 'Edward Grey', role: 'IT Admin' },
          { id: 6, name: 'Fiona Blue', role: 'CEO' }
        ]);
        setLoadingEmployees(false);
      }
    };
    
    const fetchCompanyEmployees = async (companyId, token) => {
      try {
        setLoadingEmployees(true);
        
        // Fetch users for the company using the /users endpoint with companyId param
        // This matches the API documentation
        const response = await fetch(`${env.apiBaseUrl}/users?companyId=${companyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Company employees data:', data);
        
        // Handle different response formats as described in the API doc
        let usersList = [];
        if (data && data.users) {
          usersList = data.users;
        } else if (Array.isArray(data)) {
          usersList = data;
        } else if (data.totalItems && data.users) {
          usersList = data.users;
        }
        
        // Map to the format expected by the component
        const formattedEmployees = usersList.map(user => ({
          id: user.id,
          name: user.name || 'Unknown',
          role: user.designation || user.role || 'Employee',
          email: user.email,
          department: user.department?.name
        }));
        
        setEmployees(formattedEmployees);
        console.log('Employees loaded:', formattedEmployees.length);
        
        // Also store the company ID for future reference
        localStorage.setItem('raci_company_id', companyId);
      } catch (error) {
        console.error('Failed to load employees:', error);
        setEmployeeError('Failed to load employees. Using sample data instead.');
        // Fall back to sample employees
        setEmployees([
          { id: 1, name: 'Alice Brown', role: 'Finance Manager' },
          { id: 2, name: 'Bob White', role: 'Marketing Director' },
          { id: 3, name: 'Charlie Green', role: 'Product Manager' },
          { id: 4, name: 'Diana Black', role: 'HR Manager' },
          { id: 5, name: 'Edward Grey', role: 'IT Admin' },
          { id: 6, name: 'Fiona Blue', role: 'CEO' }
        ]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    
    fetchUserData();
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

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add this state for tracking dropdown refresh
  const [dropdownRefreshKey, setDropdownRefreshKey] = useState(0);

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

  // Add a new state for event tasks
  const [eventTasks, setEventTasks] = useState([]);

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
            // Get users for this role (support both array and single value formats)
            const users = Array.isArray(selectedEmployees[role][task.id])
              ? selectedEmployees[role][task.id]
              : selectedEmployees[role][task.id]
                ? [selectedEmployees[role][task.id]]
                : [];

            // Add each user to the appropriate role array
            users.forEach(userId => {
              if (!userId) return;
              
              taskAssignment[role].push(userId);
              
              // Check for financial limits
              const key = `${role}-${task.id}-${userId}`;
              if (financialLimits[key]) {
                // Get the financial limit value
                const limitValue = Number(financialLimitValues[key]) || 0;
                
                // Use the exact format required by the API:
                // Format: "task-{taskId}-{role}-{userId}"
                const formattedKey = `task-${task.id}-${role}-${userId}`;
                
                // Create the financial limit object with min/max values
                taskAssignment.financialLimits[formattedKey] = {
                  min: 0, // Starting value
                  max: limitValue // Maximum limit
                };
                
                console.log(`Added financial limit for ${role} ${userId} on task ${task.id}: min=0, max=${limitValue}`);
              }
            });
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
      
      if (data && data.id) {
        localStorage.setItem(`event_${selectedEvent}_raci_id`, data.id);
      }
      if (data && data.eventId) {
        localStorage.setItem(`raci_matrix_event_${selectedEvent}`, data.eventId);
      }
      
      loadExistingRaciMatrix(selectedEvent);
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

  // This is the only loadExistingRaciMatrix function we should keep
  const loadExistingRaciMatrix = async (eventId) => {
    if (!eventId) return;
    
    try {
      setIsLoadingRaciData(true);
      setLoadingEmployees(true);
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/events/${eventId}/raci-matrix`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      // If the API is not implemented yet, try to load from localStorage
      if (response.status === 501) {
        console.log('RACI matrix API not implemented yet, trying localStorage');
        const savedMatrix = localStorage.getItem(`raci_matrix_${eventId}`);
        if (savedMatrix) {
          try {
            const parsedMatrix = JSON.parse(savedMatrix);
            console.log('Found saved RACI matrix in localStorage:', parsedMatrix);
            populateRaciMatrixFromStorage(parsedMatrix);
            setExistingDataFound(true);
          } catch (e) {
            console.error('Error parsing saved RACI matrix:', e);
            setExistingDataFound(false);
          }
        } else {
          setExistingDataFound(false);
        }
        setLoadingEmployees(false);
        setIsLoadingRaciData(false);
        return;
      }
      
      if (!response.ok) {
        // No RACI matrix exists for this event yet, this is normal for new events
        if (response.status === 404) {
          console.log('No RACI matrix found for this event.');
          setExistingDataFound(false);
          setLoadingEmployees(false);
          setIsLoadingRaciData(false);
          return;
        }
        
        throw new Error(`Failed to load RACI matrix: ${response.status}`);
      }
      
      const raciData = await response.json();
      console.log('Retrieved RACI matrix:', raciData);
      
      // Process the RACI data and populate the UI
      populateRaciMatrixFromAPI(raciData);
      setExistingDataFound(true);
      
      // After loading RACI data, force dropdowns to refresh
      setTimeout(() => {
        setDropdownRefreshKey(prev => prev + 1);
      }, 200);
      
    } catch (error) {
      console.error('Error loading RACI matrix:', error);
      setExistingDataFound(false);
    } finally {
      setLoadingEmployees(false);
      setIsLoadingRaciData(false);
    }
  };
  
  // Update function to populate RACI matrix from API response
  const populateRaciMatrixFromAPI = (raciData) => {
    if (!raciData || !raciData.tasks) return;
    
    console.log('Processing RACI data from API for tasks:', raciData.tasks.length);
    
    const newSelections = {
      responsible: {},
      accountable: {},
      consulted: {},
      informed: {}
    };
    
    const newFinancialLimits = {};
    const newFinancialLimitValues = {};
    
    // First, let's extract all employees from the RACI assignments for later use
    const raciEmployees = extractEmployeesFromRaciData(raciData);
    if (raciEmployees.length > 0) {
      console.log('Found employees in RACI data:', raciEmployees.length);
      setEventEmployees(prev => {
        // Combine with existing event employees without duplicates
        const empMap = new Map();
        [...prev, ...raciEmployees].forEach(emp => empMap.set(String(emp.id), emp));
        return Array.from(empMap.values());
      });
    }
    
    // Iterate through each task
    raciData.tasks.forEach(task => {
      if (!task.raci) return;
      
      const taskId = String(task.id);
      console.log(`Processing RACI for task ${taskId} - ${task.name}`);
      
      // Process each RACI role for this task
      Object.keys(task.raci).forEach(role => {
        if (!Array.isArray(task.raci[role]) || task.raci[role].length === 0) return;
        
        // Get the first user for this role (assuming single selection per role)
        const user = task.raci[role][0];
        if (!user || !user.id) return;
        
        console.log(`Found ${role} assignment for task ${taskId}: User ${user.id} (${user.name})`);
        
        // Store the user selection for this task and role
        newSelections[role][taskId] = String(user.id);
        
        // If financial limits exist
        if (user.financialLimits) {
          const key = `${role}-${taskId}-${user.id}`;
          newFinancialLimits[key] = true;
          
          // Prioritize max value, then value, then min
          if (user.financialLimits.max !== undefined) {
            newFinancialLimitValues[key] = user.financialLimits.max;
          } else if (user.financialLimits.value !== undefined) {
            newFinancialLimitValues[key] = user.financialLimits.value;
          } else if (user.financialLimits.min !== undefined) {
            newFinancialLimitValues[key] = user.financialLimits.min;
          }
        }
      });
    });
    
    console.log('Populated selections from API:', newSelections);
    console.log('Financial limits from API:', newFinancialLimits);
    console.log('Financial limit values from API:', newFinancialLimitValues);
    
    setSelectedEmployees(newSelections);
    setFinancialLimits(newFinancialLimits);
    setFinancialLimitValues(newFinancialLimitValues);
    
    // Ensure we have tasks data
    if (raciData.tasks && raciData.tasks.length > 0) {
      setTasks(raciData.tasks.map(task => ({
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
    
    // Force refresh for dropdowns
    setTimeout(() => {
      setDropdownRefreshKey(prev => prev + 1);
    }, 100);
  };

  // Add helper function to extract employees from RACI data
  const extractEmployeesFromRaciData = (raciData) => {
    const employeesMap = new Map();
    
    if (!raciData || !raciData.tasks) return [];
    
    raciData.tasks.forEach(task => {
      if (!task.raci) return;
      
      // Process each RACI role
      ['responsible', 'accountable', 'consulted', 'informed'].forEach(role => {
        if (!Array.isArray(task.raci[role])) return;
        
        task.raci[role].forEach(user => {
          if (!user || !user.id) return;
          
          // Format and store unique employees by ID
          employeesMap.set(String(user.id), {
            id: String(user.id),
            name: user.name || 'Unknown',
            role: user.designation || user.role || 'Employee',
            email: user.email || '',
            department: user.department?.name || ''
          });
        });
      });
    });
    
    return Array.from(employeesMap.values());
  };

  // Update the populateRaciMatrixFromStorage function to forcefully refresh the UI
  const populateRaciMatrixFromStorage = (savedMatrix) => {
    if (!savedMatrix || !savedMatrix.taskAssignments) return;
    
    const newSelections = {
      responsible: {},
      accountable: {},
      consulted: {},
      informed: {}
    };
    
    const newFinancialLimits = {};
    const newFinancialLimitValues = {};
    
    savedMatrix.taskAssignments.forEach(taskAssignment => {
      const taskId = taskAssignment.taskId.toString();
      
      // Process responsible employees
      if (taskAssignment.responsible && taskAssignment.responsible.length > 0) {
        const userId = taskAssignment.responsible[0].toString();
        newSelections.responsible[taskId] = userId;
        
        // Check for financial limits
        const limitKey = `task-${taskId}-responsible-${userId}`;
        if (taskAssignment.financialLimits && taskAssignment.financialLimits[limitKey]) {
          const key = `responsible-${taskId}-${userId}`;
          newFinancialLimits[key] = true;
          newFinancialLimitValues[key] = taskAssignment.financialLimits[limitKey].value;
        }
      }
      
      // Process accountable employees
      if (taskAssignment.accountable && taskAssignment.accountable.length > 0) {
        const userId = taskAssignment.accountable[0].toString();
        newSelections.accountable[taskId] = userId;
        
        // Check for financial limits
        const limitKey = `task-${taskId}-accountable-${userId}`;
        if (taskAssignment.financialLimits && taskAssignment.financialLimits[limitKey]) {
          const key = `accountable-${taskId}-${userId}`;
          newFinancialLimits[key] = true;
          newFinancialLimitValues[key] = taskAssignment.financialLimits[limitKey].value;
        }
      }
      
      // Process consulted employees
      if (taskAssignment.consulted && taskAssignment.consulted.length > 0) {
        const userId = taskAssignment.consulted[0].toString();
        newSelections.consulted[taskId] = userId;
        
        // Check for financial limits
        const limitKey = `task-${taskId}-consulted-${userId}`;
        if (taskAssignment.financialLimits && taskAssignment.financialLimits[limitKey]) {
          const key = `consulted-${taskId}-${userId}`;
          newFinancialLimits[key] = true;
          newFinancialLimitValues[key] = taskAssignment.financialLimits[limitKey].value;
        }
      }
      
      // Process informed employees
      if (taskAssignment.informed && taskAssignment.informed.length > 0) {
        const userId = taskAssignment.informed[0].toString();
        newSelections.informed[taskId] = userId;
        
        // Check for financial limits
        const limitKey = `task-${taskId}-informed-${userId}`;
        if (taskAssignment.financialLimits && taskAssignment.financialLimits[limitKey]) {
          const key = `informed-${taskId}-${userId}`;
          newFinancialLimits[key] = true;
          newFinancialLimitValues[key] = taskAssignment.financialLimits[limitKey].value;
        }
      }
    });
    
    console.log('Populated selections from storage:', newSelections);
    setSelectedEmployees(newSelections);
    setFinancialLimits(newFinancialLimits);
    setFinancialLimitValues(newFinancialLimitValues);

    // Force UI refresh for dropdowns with a slight delay to ensure React has updated the DOM
    setTimeout(() => {
      setDropdownRefreshKey(prev => prev + 1);
    }, 100);
  };

  // Add this effect to debug when selections change
  useEffect(() => {
    if (existingDataFound) {
      console.log('Current selected employees:', selectedEmployees);
    }
  }, [selectedEmployees, existingDataFound]);

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
      
      // Process tasks - this is new
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
        
        // Replace the tasks state with these event tasks
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

  // Add a helper function to check if an employee is already assigned to any role for a specific task
  const isEmployeeAssignedElsewhere = (taskId, currentRole, employeeId) => {
    if (!employeeId) return false;
    
    // Check if this employee is assigned to any other role for this task
    const roles = ['responsible', 'accountable', 'consulted', 'informed'];
    
    // Look through all roles except the current one
    return roles
      .filter(role => role !== currentRole)
      .some(role => selectedEmployees[role][taskId] === employeeId);
  };

  // Update handleEmployeeSelect to remove employee from other roles if selected
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

  // Fix RACI matrix columns to show employee dropdowns for all roles (R, A, C, I)
  const renderRACIMatrix = () => {
    if (!selectedEvent || !taskAssignments || taskAssignments.length === 0) {
      return (
        <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p>Select an event and add tasks to create a RACI matrix</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                Tasks
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-red-50">
                Responsible (R)
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-blue-50">
                Accountable (A)
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-green-50">
                Consulted (C)
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                Informed (I)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {taskAssignments.map((task, index) => (
              <tr key={task.id || index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                  {task.name}
                </td>
                
                {/* Responsible Column */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r bg-red-50">
                  <div className="flex flex-col space-y-2">
                    <select
                      multiple
                      value={task.responsible || []}
                      onChange={(e) => handleRoleAssignment(task.id, 'responsible', getMultiSelectValues(e))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      size="3"
                    >
                      {filteredEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => handleClearRole(task.id, 'responsible')}
                        className="text-xs text-red-600 hover:text-red-900"
                      >
                        Clear
                      </button>
                    </div>
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
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      
      // Handle different response formats
      let employeesList = [];
      if (departmentId && data.employees) {
        // If we're fetching from a department
        employeesList = data.employees;
      } else {
        // If we're fetching all users
        employeesList = Array.isArray(data) ? data : [];
      }
      
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
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="event">Event Selection</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  id="event"
                  name="event"
                  value={selectedEvent}
                  onChange={handleEventChange}
                  required
                  style={{ flex: 1 }}
                >
                  <option value="">Select Event</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => alert('GPT Enhancement would be shown here')}
                >
                  Know More
                </button>
              </div>
            </div>
          </div>
          
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
                          width: '20%'
                        }}>Task</th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '20%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#2563eb' }}>Responsible (R)</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Does the work</div>
                        </th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '20%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#059669' }}>Accountable (A)</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Approves the work</div>
                        </th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '20%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#d97706' }}>Consulted (C)</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Provides input</div>
                        </th>
                        <th style={{ 
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center',
                          width: '20%'
                        }}>
                          <div style={{ fontWeight: '500', color: '#7c3aed' }}>Informed (I)</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Receives updates</div>
                        </th>
                        {/* Removed the Action/Delete column */}
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task, index) => (
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
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!selectedEvent}
            >
              Submit for Approval
            </button>
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
              <p>Please enter the email of the person who should approve this RACI matrix:</p>
              <div className="form-group">
                <input
                  type="email"
                  value={approvalEmail}
                  onChange={(e) => setApprovalEmail(e.target.value)}
                  placeholder="Enter approver's email"
                  required
                  style={{ width: '100%' }}
                />
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
          max-width: 100%;
          overflow-x: auto;
          margin-bottom: 1rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .raci-matrix {
          min-width: 100%;
          border-collapse: collapse;
        }
        
        .raci-matrix th, .raci-matrix td {
          padding: 1rem;
          vertical-align: top;
        }
        
        .raci-matrix th {
          position: sticky;
          top: 0;
          background-color: #f9fafb;
          z-index: 10;
        }
        
        @media (max-width: 1024px) {
          .raci-matrix {
            min-width: 900px;
          }
        }
      `}</style>
    </div>
  );
};

export default RACIAssignment;
