import React, { useState, useEffect } from 'react';
import env from '../../src/config/env';
import raciService from '../../src/services/raci.service';

const RACIAssignment = () => {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalEmail, setApprovalEmail] = useState('');
  // Event-wise approval data
  const [eventApprovalData, setEventApprovalData] = useState({});
  
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
            return parsed;
          }
        } catch (e) {
          // Error loading from localStorage
        }
    return [];
  });
  
  // Add a side effect to save event employees to localStorage for debugging
  useEffect(() => {
    if (eventEmployees && eventEmployees.length > 0) {
      try {
        localStorage.setItem('debug_event_employees', JSON.stringify(eventEmployees));
      } catch (e) {
        // Error saving to localStorage
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
          return;
        }

        // If token was in sessionStorage but not localStorage, copy it to localStorage
        if (!localStorage.getItem('raci_auth_token')) {
          localStorage.setItem('raci_auth_token', token);
        }

        // Try to get user data and company ID if we don't have it (optional)
        if (!currentCompanyId) {
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
                sessionStorage.setItem('raci_company_id', userData.company.id);
                setCompanyId(userData.company.id);
                currentCompanyId = userData.company.id;
              }
            }
          } catch (error) {
            // Could not fetch company ID, but continuing
          }
        } else {
          setCompanyId(currentCompanyId);
        }

        // Don't block the component if company ID is not available

      } catch (error) {
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
        console.log('RACIAssignment: Raw events response:', eventsData);
        
        // Handle different response formats
        let eventsList = [];
        if (eventsData && eventsData.events) {
          eventsList = eventsData.events;
        } else if (Array.isArray(eventsData)) {
          eventsList = eventsData;
        }
        
        console.log('RACIAssignment: Processed events list:', eventsList);
        
        // Include events with various approved status values
        let approvedEvents = eventsList.filter(evt => {
          const status = evt.status?.toLowerCase();
          return ['approved', 'APPROVED', 'active', 'ACTIVE', 'completed', 'COMPLETED'].includes(status);
        });
        
        console.log('RACIAssignment: All events:', eventsList.map(e => ({ id: e.id, name: e.name, status: e.status })));
        console.log('RACIAssignment: Approved events:', approvedEvents.map(e => ({ id: e.id, name: e.name, status: e.status })));
        
        // If no approved events found, show all events as fallback
        if (approvedEvents.length === 0 && eventsList.length > 0) {
          console.log('RACIAssignment: No approved events found, showing all events as fallback');
          approvedEvents = eventsList;
        }
        
        setEvents(approvedEvents);
      } catch (error) {
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

  // Add state for tracking RACI changes and rejection reason modal
  const [raciHasChanges, setRaciHasChanges] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [originalRaciState, setOriginalRaciState] = useState(null);
  
  // Add state to track if RACI matrix has been successfully saved
  const [raciMatrixSaved, setRaciMatrixSaved] = useState(false);

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



  // Update the saveRaciMatrix function to handle multiple employees
  const saveRaciMatrix = async () => {
    if (!selectedEvent) {
      setError('Please select an event first');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');



      const payload = {
        eventId: selectedEvent,
        taskAssignments: tasks.map(task => {
          const taskAssignment = {
            taskId: task.id,
            responsible: [],
            accountable: [],
            consulted: [],
            informed: [],
            financialLimits: {},
            levels: {}
          };

                            ['responsible', 'accountable', 'consulted', 'informed'].forEach(role => {
            const selectedIds = getSelectedEmployeesArray(task.id, role);
            const hierarchyKey = `${role}-${task.id}`;
            const hierarchyRows = extraFinancialLimits[hierarchyKey] || [];
            

            
                      // Collect all hierarchy user IDs to exclude from main level
          const hierarchyUserIds = new Set();
          hierarchyRows.forEach(row => {
            if (row.userIds && Array.isArray(row.userIds)) {
              row.userIds.forEach(userId => {
                hierarchyUserIds.add(String(userId));
              });
            }
          });
          

          
          // Process ONLY main level employees (exclude hierarchy users)
          selectedIds.forEach(userId => {
            const userIdNum = parseInt(userId, 10);
            if (isNaN(userIdNum)) return;
            
            // CRITICAL: Skip hierarchy users from main level
            if (hierarchyUserIds.has(String(userId))) {
              return;
            }
            
            taskAssignment[role].push(userIdNum);
            
            // Handle financial limits for main level employees
            const key = `${role}-${task.id}-${userId}`;
            const formattedKey = `task-${task.id}-${role}-${userIdNum}`;
            
            // Always create a financial limit entry, even if disabled
            const isEnabled = financialLimits[key] || false;
            const limitValue = isEnabled && financialLimitValues[key] ? 
              Number(financialLimitValues[key]) : 0;
            
            taskAssignment.financialLimits[formattedKey] = {
              min: 0,
              max: limitValue,
              value: limitValue,
              role,
              userId: userIdNum,
              enabled: isEnabled,
              type: role,
              hierarchyIndex: 0
            };
            
            // Set level for main level users (level 1)
            taskAssignment.levels[formattedKey] = 1;
          });

          // Process hierarchy levels (simplified structure)
          
          let runningMin = 0;
          // Get max from main level users
          selectedIds.forEach(userId => {
            if (!hierarchyUserIds.has(String(userId))) {
              const key = `${role}-${task.id}-${userId}`;
              if (financialLimits[key] && financialLimitValues[key]) {
                const value = Number(financialLimitValues[key]);
                if (!isNaN(value) && value > runningMin) {
                  runningMin = value;
                }
              }
            }
          });
          
          hierarchyRows.forEach((row, levelIndex) => {
            if (!row.userIds || !Array.isArray(row.userIds) || row.userIds.length === 0 || !row.amount) {
              return;
            }
            
            const currentMax = Number(row.amount);
            if (isNaN(currentMax)) {
              return;
            }
            
            row.userIds.forEach(userId => {
              const userIdNum = parseInt(userId, 10);
              if (isNaN(userIdNum)) {
                return;
              }
              
              // CRITICAL: Add hierarchy user to role array ONLY here
              if (!taskAssignment[role].includes(userIdNum)) {
                taskAssignment[role].push(userIdNum);
              }
              
              const formattedKey = `task-${task.id}-${role}-${userIdNum}`;
              const hierarchyLevel = levelIndex + 2; // Hierarchy users start at level 2
              
              taskAssignment.financialLimits[formattedKey] = {
                min: runningMin,
                max: currentMax,
                value: currentMax,
                role,
                userId: userIdNum,
                enabled: true,
                type: role,
                hierarchyIndex: levelIndex + 1,
                hierarchyGroup: `level-${levelIndex + 1}`,
                isHierarchyUser: true
              };
              
              // Set level for hierarchy users (level 2, 3, 4, etc.)
              taskAssignment.levels[formattedKey] = hierarchyLevel;
            });
            
            runningMin = currentMax;
          });
          

        });

        // Debug: Log the levels object for this task
        
        return taskAssignment;
        })
      };



      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/raci`, {
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
      
      setSuccess('RACI matrix saved successfully! You can now submit it for approval.');
      
      // Reset original state to current state after successful save
      setOriginalRaciState({
        selectedEmployees,
        financialLimits,
        financialLimitValues,
        extraFinancialLimits
      });
      setRaciHasChanges(false);
      
      // Mark that RACI matrix has been successfully saved
      setRaciMatrixSaved(true);
      
      await loadExistingRaciMatrix(selectedEvent);
      
    } catch (error) {
      setError(error.message || 'Failed to save RACI matrix. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle RACI approval submission using proper API
  const handleApprovalSubmit = async () => {
    // Parse selected approver emails and validate exactly 2 are selected
    const approverEmails = approvalEmail ? approvalEmail.split(',').map(email => email.trim()).filter(email => email) : [];
    
    if (approverEmails.length !== 2) {
      alert('Please select exactly 2 people for RACI approval');
      return;
    }

    if (!selectedEvent) {
      alert('Please select an event first');
      return;
    }

    try {
      // Step 1: First save the current RACI matrix (if it hasn't been saved yet)
      try {
        await saveRaciMatrix();
      } catch (saveError) {
        // Continue anyway - the matrix might already be saved
      }
      
      // Step 2: Convert email addresses to user IDs
      const allEmployees = getDisplayEmployees();
      const approvers = [];
      
      for (let i = 0; i < approverEmails.length; i++) {
        const email = approverEmails[i];
        const employee = allEmployees.find(emp => emp.email === email);
        
        if (!employee) {
          throw new Error(`Could not find user with email: ${email}`);
        }
        
        approvers.push({
          userId: parseInt(employee.id),
          approvalLevel: i + 1 // First approver = level 1, second = level 2
        });
      }



      // Step 3: Use the proper RACI approval API endpoint
      const approversData = { approvers };
      const result = await raciService.createRACIApprovalRequests(selectedEvent, approversData);
      
      // Store the approval data for this specific event
      const approverDetails = approvers.map(approver => {
        const employee = allEmployees.find(emp => emp.id === approver.userId.toString());
        return {
          userId: approver.userId,
          approvalLevel: approver.approvalLevel,
          name: employee ? employee.name : 'Unknown',
          email: employee ? employee.email : 'Unknown'
        };
      });
      
      // Set the approval info immediately
      const approvalInfo = {
        status: 'PENDING_APPROVAL',
        comments: '',
        approvers: approverDetails,
        submittedAt: new Date().toISOString(),
        currentLevel: 1,
        totalLevels: 2
      };
      
      setEventApprovalData(prev => ({
        ...prev,
        [selectedEvent]: approvalInfo
      }));
      
      // Clear form and update UI
      setApprovalEmail('');
      setShowApprovalModal(false);
      setDropdownRefreshKey(prev => prev + 1);
      
      // Reset change tracking after successful submission
      setOriginalRaciState({
        selectedEmployees,
        financialLimits,
        financialLimitValues,
        extraFinancialLimits
      });
      setRaciHasChanges(false);
      
      // Reset saved state after successful submission
      setRaciMatrixSaved(false);
      
      // Show success message
      setSuccess('RACI matrix submitted for approval successfully! Status: Pending Approval');
      
      // Refresh status from API
      setTimeout(async () => {
        await fetchApprovalStatusWithRetry(selectedEvent, approvalInfo);
      }, 1000);
      
    } catch (error) {
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
      return { token: null, companyId: null };
    }
  };

  const loadExistingRaciMatrix = async (eventId) => {
    if (!eventId) return;
    
    try {
      setIsLoadingRaciData(true);
      setLoadingEmployees(true);
      
      const token = localStorage.getItem('raci_auth_token') || sessionStorage.getItem('raci_auth_token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      
      // First try to get event details
      const eventResponse = await fetch(`${env.apiBaseUrl}/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        
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
      
      // Load approval status from RACI approval system
      await fetchApprovalStatusWithRetry(eventId);
      
      /* ------------------------------------------------------------------
         Retrieve existing RACI matrix for the event using the RACI service
      ------------------------------------------------------------------*/

      try {
        const raciData = await raciService.getRACIMatrixByEvent(eventId);
        
        if (raciData) {
          populateRaciMatrixFromAPI(raciData);
          setExistingDataFound(true);
        }
        return;
      } catch (error) {
        // RACI service failed, falling back to direct fetch
      }

      // Fallback to direct fetch if service fails
      const raciResponse = await fetch(`${env.apiBaseUrl}/raci/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      // If the endpoint is not yet available, try localStorage cache
      if (raciResponse.status === 501) {
        const cached = localStorage.getItem(`raci_matrix_${eventId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            populateRaciMatrixFromAPI(parsed);
            setExistingDataFound(true);
          } catch (e) {
            setExistingDataFound(false);
          }
              } else {
        setExistingDataFound(false);
        // Reset saved state when no existing data is found
        setRaciMatrixSaved(false);
      }
        return;
      }
      
      if (!raciResponse.ok) {
        // A 404 simply means no matrix exists yet for this event
        if (raciResponse.status === 404) {
          setExistingDataFound(false);
          setRaciMatrixSaved(false);
          return;
        }
        throw new Error(`Failed to load RACI matrix: ${raciResponse.status}`);
      }
      
      const raciData = await raciResponse.json();
      
      if (raciData) {
        populateRaciMatrixFromAPI(raciData);
        setExistingDataFound(true);
        
        // Set event-specific approval data if available
        const eventApprovalInfo = {
          status: raciData.status || null,
          comments: raciData.comments || '',
          approvers: []
        };
        
        // Set selected approvers if available
        if (raciData.approvers && Array.isArray(raciData.approvers)) {
          eventApprovalInfo.approvers = raciData.approvers;
        } else if (raciData.approverEmails) {
          // Handle old format with emails
          const approverEmails = Array.isArray(raciData.approverEmails) 
            ? raciData.approverEmails 
            : raciData.approverEmails.split(',').map(email => email.trim());
          
          eventApprovalInfo.approvers = approverEmails.map((email, index) => ({
            userId: null,
            approvalLevel: index + 1,
            name: email.split('@')[0], // Use email prefix as name fallback
            email: email
          }));
        }
        
        // Store the approval data for this specific event
        if (eventApprovalInfo.status || eventApprovalInfo.approvers.length > 0) {
          setEventApprovalData(prev => ({
            ...prev,
            [eventId]: eventApprovalInfo
          }));
        }
      }

    } catch (error) {
      setError(error.message || 'Failed to load RACI matrix');
      setExistingDataFound(false);
      setRaciMatrixSaved(false);
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
        
        if (deptData && deptData.employees && Array.isArray(deptData.employees)) {
          const formattedDeptEmployees = deptData.employees.map(user => ({
            id: String(user.id), // Ensure ID is string
            name: user.name || 'Unknown',
            role: user.designation || user.role || 'Employee',
            email: user.email,
            department: deptData.name
          }));
          
          setEventEmployees(formattedDeptEmployees);
        } else {
          // No employees in department, clear event employees
          setEventEmployees([]);
        }
      }
    } catch (error) {
      setEventEmployees([]);
    }
  };

  // Helper function to get selected employees as array
  const getSelectedEmployeesArray = (taskId, role) => {
    const selection = selectedEmployees[role]?.[taskId];
    if (!selection) return [];
    return Array.isArray(selection) ? selection : [selection];
  };

  // Helper function to add employee to selection
  const addEmployeeToSelection = (taskId, role, userId) => {
    if (!userId) return;
    
    setSelectedEmployees(prev => {
      const currentSelection = getSelectedEmployeesArray(taskId, role);
      if (currentSelection.includes(userId)) return prev; // Already selected
      
      const newSelection = [...currentSelection, userId];
      
      // Handle duplicate prevention across roles if needed
      const updatedSelections = { ...prev };
      if (!allowMultipleRolesPerTask) {
        const roles = ['responsible', 'accountable', 'consulted', 'informed'];
        roles.forEach(otherRole => {
          if (otherRole !== role && updatedSelections[otherRole]?.[taskId]) {
            const otherSelection = Array.isArray(updatedSelections[otherRole][taskId]) 
              ? updatedSelections[otherRole][taskId] 
              : [updatedSelections[otherRole][taskId]];
            const filteredSelection = otherSelection.filter(id => id !== userId);
            if (filteredSelection.length === 0) {
              delete updatedSelections[otherRole][taskId];
            } else {
              updatedSelections[otherRole][taskId] = filteredSelection;
            }
          }
        });
      }
      
      return {
        ...updatedSelections,
        [role]: {
          ...updatedSelections[role],
          [taskId]: newSelection
        }
      };
    });
  };

  // Helper function to remove employee from selection
  const removeEmployeeFromSelection = (taskId, role, userId) => {
    setSelectedEmployees(prev => {
      const currentSelection = getSelectedEmployeesArray(taskId, role);
      const newSelection = currentSelection.filter(id => id !== userId);
      
      const updatedRole = { ...prev[role] };
      if (newSelection.length === 0) {
        delete updatedRole[taskId];
      } else {
        updatedRole[taskId] = newSelection;
      }
      
      return {
        ...prev,
        [role]: updatedRole
      };
    });

    // Clean up financial limits for removed employee
    const key = `${role}-${taskId}-${userId}`;
    setFinancialLimits(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    setFinancialLimitValues(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  // Render selected employees as chips with remove functionality
  const renderSelectedEmployeeChips = (taskId, role) => {
    const selectedIds = getSelectedEmployeesArray(taskId, role);
    if (selectedIds.length === 0) return null;

    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.25rem', 
        marginTop: '0.5rem' 
      }}>
        {selectedIds.map(userId => {
          const employee = getDisplayEmployees().find(emp => emp.id === userId);
          if (!employee) return null;
          
          return (
            <span
              key={`chip-${role}-${taskId}-${userId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#e5e7eb',
                color: '#374151',
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                gap: '0.25rem'
              }}
            >
              {employee.name}
              <button
                type="button"
                onClick={() => removeEmployeeFromSelection(taskId, role, userId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1
                }}
                title={`Remove ${employee.name}`}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    );
  };

  // Add a helper function to check if an employee is already assigned to any role for a specific task
  const isEmployeeAssignedElsewhere = (taskId, currentRole, employeeId) => {
    // If the user allows duplicates, we never treat the employee as "assigned elsewhere"
    if (allowMultipleRolesPerTask || !employeeId) return false;
    
    const roles = ['responsible', 'accountable', 'consulted', 'informed'];
    return roles
      .filter(role => role !== currentRole)
      .some(role => getSelectedEmployeesArray(taskId, role).includes(employeeId));
  };

  // Update handleEmployeeSelect to add employee to selection (multiple employees support)
  const handleEmployeeSelect = (taskId, role, userId) => {
    if (!userId) return; // Don't add empty selection
    addEmployeeToSelection(taskId, role, userId);
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
        Object.entries(selectedEmployees[role] || {}).forEach(([taskId, selection]) => {
          const userIds = Array.isArray(selection) ? selection : [selection];
          userIds.forEach(userId => {
            if (!userId) return;
            if (!perTaskUserSeen[taskId]) perTaskUserSeen[taskId] = new Set();

            if (!perTaskUserSeen[taskId].has(userId)) {
              if (!cleaned[role][taskId]) cleaned[role][taskId] = [];
              cleaned[role][taskId] = Array.isArray(cleaned[role][taskId]) 
                ? [...cleaned[role][taskId], userId] 
                : [cleaned[role][taskId], userId];
              perTaskUserSeen[taskId].add(userId);
            }
          });
        });
      });

      // Only update state if something actually changed
      const changed = JSON.stringify(cleaned) !== JSON.stringify(selectedEmployees);
      if (changed) setSelectedEmployees(cleaned);
    }
  }, [allowMultipleRolesPerTask]);

  // Handle financial limits for multiple employees
  const handleFinancialLimitChange = (taskId, role, value) => {
    // Get all selected employees for this role/task
    const selectedIds = getSelectedEmployeesArray(taskId, role);
    if (selectedIds.length === 0) return;
    
    // Allow empty string or valid numbers (don't force to '0')
    const sanitizedValue = value === '' ? '' : value;
    
    // Apply the same limit to all selected employees
    selectedIds.forEach(userId => {
      const key = `${role}-${taskId}-${userId}`;
      
      setFinancialLimitValues(prev => ({
        ...prev,
        [key]: sanitizedValue
      }));
      
      // Also ensure the limit is enabled when user enters a value
      if (sanitizedValue !== '') {
      setFinancialLimits(prev => ({
        ...prev,
        [key]: true
      }));
      }
      

    });
  };

  const toggleFinancialLimit = (taskId, role) => {
    const selectedIds = getSelectedEmployeesArray(taskId, role);
    if (selectedIds.length === 0) return;
    
    // Get current state from first user to determine new state
    const firstKey = `${role}-${taskId}-${selectedIds[0]}`;
    const newState = !financialLimits[firstKey];
    
    // Apply to all selected users
    selectedIds.forEach(userId => {
      const key = `${role}-${taskId}-${userId}`;
      
      setFinancialLimits(prev => ({
        ...prev,
        [key]: newState
      }));
      
      // If turning on, initialize with empty value if not set
      if (newState) {
        setFinancialLimitValues(prev => ({
          ...prev,
          [key]: prev[key] || ''
        }));
      }
      

    });
  };

  // Add a new function to properly extract financial limits from API response
  const extractFinancialLimitsFromRaciData = (raciData) => {
    const financialLimitMap = {};
    const financialLimitValueMap = {};
    const extraFinancialLimitsMap = {};
    
    if (!raciData || (!raciData.tasks && !Array.isArray(raciData))) {
      return { financialLimitMap, financialLimitValueMap, extraFinancialLimitsMap };
    }

    // Process array format (from database) - SIMPLIFIED APPROACH
    if (Array.isArray(raciData)) {

      
      raciData.forEach(assignment => {
        // Handle multiple possible field names from different API responses
        const taskId = String(assignment.task_id || assignment.taskId || assignment.id);
        const role = (assignment.role || assignment.raci_role || '').toLowerCase();
        const userId = String(assignment.user_id || assignment.userId || assignment.id);
        const minLimit = Number(assignment.min_limit || assignment.minLimit || assignment.min || 0);
        const maxLimit = Number(assignment.max_limit || assignment.maxLimit || assignment.max || assignment.amount || 0);
        
        if (!taskId || !role || !userId) {
          return;
        }
        
        const groupKey = `${role}-${taskId}`;
        const mainKey = `${groupKey}-${userId}`;
        
        if (minLimit === 0) {
          // MAIN LEVEL USER (min_limit = 0)
          financialLimitMap[mainKey] = true;
          financialLimitValueMap[mainKey] = String(maxLimit);
        } else {
          // HIERARCHY USER (min_limit > 0)
          
          if (!extraFinancialLimitsMap[groupKey]) {
            extraFinancialLimitsMap[groupKey] = [];
          }
          
          // Add directly to hierarchy levels
          extraFinancialLimitsMap[groupKey].push({
            userIds: [userId],
            amount: String(maxLimit)
          });
        }
      });
    }
    
    // Handle object format (legacy support)
    else if (raciData.tasks) {
      raciData.tasks.forEach(task => {
        if (!task.id) return;
        
        const taskId = String(task.id);
        
        // Check if financial limits exist at task level
        if (task.financialLimits) {
          
          // Process task-level financial limits
          Object.entries(task.financialLimits).forEach(([key, limits]) => {
            // Parse key format: task-{taskId}-{role}-{userId}
            const keyParts = key.split('-');
            if (keyParts.length >= 4 && keyParts[0] === 'task') {
              const limitTaskId = keyParts[1];
              const role = keyParts[2];
              const userId = keyParts[3];
              
              if (limitTaskId !== taskId) return;
              
                          const groupKey = `${role}-${taskId}`;
            const mainKey = `${groupKey}-${userId}`;
              
              // Check if this is a hierarchy user
              const isHierarchyUser = limits.isHierarchyUser || (limits.hierarchyIndex && limits.hierarchyIndex > 0);
              
                          if (isHierarchyUser) {
                
                // Handle hierarchy user
                if (!extraFinancialLimitsMap[groupKey]) {
                  extraFinancialLimitsMap[groupKey] = [];
                }
                
                              // Add as individual hierarchy row (simplified structure)
              extraFinancialLimitsMap[groupKey].push({
                userIds: [userId],
                amount: String(limits.max || limits.value || 0)
              });
            } else {
                
                // Handle main level user
                financialLimitMap[mainKey] = limits.enabled !== false;
                financialLimitValueMap[mainKey] = String(limits.max || limits.value || 0);
              }
            }
          });
        }
        
        // Also process RACI assignments if they exist
        if (task.raci) {
          Object.entries(task.raci).forEach(([role, users]) => {
            if (!Array.isArray(users)) return;
            
            users.forEach(user => {
              if (!user || !user.id) return;
              
              const userId = String(user.id);
              const limits = user.financialLimits || {};
              const hierarchyIndex = limits.hierarchyIndex;
              const isHierarchyUser = limits.isHierarchyUser || (hierarchyIndex && hierarchyIndex > 0);
              
              const groupKey = `${role.toLowerCase()}-${taskId}`;
              const mainKey = `${groupKey}-${userId}`;
              
                          if (isHierarchyUser) {
                // Handle hierarchy user - same logic as above
                if (!extraFinancialLimitsMap[groupKey]) {
                  extraFinancialLimitsMap[groupKey] = [];
                }
                
                // Add as individual hierarchy row (simplified structure)
                extraFinancialLimitsMap[groupKey].push({
                  userIds: [userId],
                  amount: String(limits.max || limits.value || 0)
                });
              } else {
                // Handle main level user
                financialLimitMap[mainKey] = limits.enabled !== false;
                financialLimitValueMap[mainKey] = String(limits.max || limits.value || 0);
              }
            });
          });
        }
      });
    }

    // Sort hierarchy levels by amount for all groups and clean up empty levels
    Object.keys(extraFinancialLimitsMap).forEach(groupKey => {
      if (extraFinancialLimitsMap[groupKey].length > 0) {
        // Remove empty levels (levels with no users)
        extraFinancialLimitsMap[groupKey] = extraFinancialLimitsMap[groupKey].filter(level => 
          level.userIds && level.userIds.length > 0
        );
        
        // Sort by amount
        extraFinancialLimitsMap[groupKey].sort((a, b) => Number(a.amount) - Number(b.amount));

      }
    });


    
    // CRITICAL: Log hierarchy levels in detail
    
    if (Object.keys(extraFinancialLimitsMap).length === 0) {
      
    }

    return { financialLimitMap, financialLimitValueMap, extraFinancialLimitsMap };
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
      setRaci(prevRaci => {
        const updatedRaci = {
          ...prevRaci,
          tasks: [...(prevRaci.tasks || []), newRaciTask]
        };
        return updatedRaci;
      });
      
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks, newTask];
        return updatedTasks;
      });
      
      // Start editing the new task immediately
      setTimeout(() => {
        startEditingTask(newTask);
      }, 10);
      
    } catch (error) {
      // Error adding new task
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
                          value=""
                          onChange={(e) => {
                            handleEmployeeSelect(task.id, 'responsible', e.target.value);
                            // Reset dropdown after selection
                            e.target.value = '';
                          }}
                          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Employee</option>
                          {getDisplayEmployees().map(emp => {
                            const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'responsible', emp.id);
                            const isAlreadySelected = getSelectedEmployeesArray(task.id, 'responsible').includes(emp.id);
                            const isDisabled = isAssignedElsewhere || isAlreadySelected;
                            return (
                              <option 
                                key={emp.id} 
                                value={emp.id}
                                disabled={isDisabled}
                              >
                                {emp.name}
                                {isAlreadySelected ? ' (Already selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        
                        {/* Show selected employees list */}
                        {renderSelectedEmployeeChips(task.id, 'responsible')}
                        
                        {getSelectedEmployeesArray(task.id, 'responsible').length > 0 && (
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={getSelectedEmployeesArray(task.id, 'responsible').some(userId => financialLimits[`responsible-${task.id}-${userId}`])}
                                onChange={() => toggleFinancialLimit(task.id, 'responsible')}
                                className="mr-2"
                              />
                              <span className="text-sm">Financial Limit</span>
                            </label>
                            {financialLimits[`responsible-${task.id}-${getSelectedEmployeesArray(task.id, 'responsible')[0]}`] && (
                              <input
                                type="number"
                                min="0"
                                value={financialLimitValues[`responsible-${task.id}-${getSelectedEmployeesArray(task.id, 'responsible')[0]}`] || ''}
                                onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
                                          'responsible', 
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

                    {/* Accountable Cell */}
                    <td className="px-3 py-4 text-sm border-r">
                      <div className="flex flex-col space-y-2">
                        <select
                          key={`accountable-${task.id}-${dropdownRefreshKey}`}
                          value=""
                          onChange={(e) => {
                            handleEmployeeSelect(task.id, 'accountable', e.target.value);
                            // Reset dropdown after selection
                            e.target.value = '';
                          }}
                          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Employee</option>
                          {getDisplayEmployees().map(emp => {
                            const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'accountable', emp.id);
                            const isAlreadySelected = getSelectedEmployeesArray(task.id, 'accountable').includes(emp.id);
                            const isDisabled = isAssignedElsewhere || isAlreadySelected;
                            return (
                              <option 
                                key={emp.id} 
                                value={emp.id}
                                disabled={isDisabled}
                              >
                                {emp.name}
                                {isAlreadySelected ? ' (Already selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        
                        {/* Show selected employees list */}
                        {renderSelectedEmployeeChips(task.id, 'accountable')}
                        
                        {getSelectedEmployeesArray(task.id, 'accountable').length > 0 && (
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={getSelectedEmployeesArray(task.id, 'accountable').some(userId => financialLimits[`accountable-${task.id}-${userId}`])}
                                onChange={() => toggleFinancialLimit(task.id, 'accountable')}
                                className="mr-2"
                              />
                              <span className="text-sm">Financial Limit</span>
                            </label>
                            {financialLimits[`accountable-${task.id}-${getSelectedEmployeesArray(task.id, 'accountable')[0]}`] && (
                              <input
                                type="number"
                                min="0"
                                value={financialLimitValues[`accountable-${task.id}-${getSelectedEmployeesArray(task.id, 'accountable')[0]}`] || ''}
                                onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
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
                          value=""
                          onChange={(e) => {
                            handleEmployeeSelect(task.id, 'consulted', e.target.value);
                            // Reset dropdown after selection
                            e.target.value = '';
                          }}
                          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Employee</option>
                          {getDisplayEmployees().map(emp => {
                            const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'consulted', emp.id);
                            const isAlreadySelected = getSelectedEmployeesArray(task.id, 'consulted').includes(emp.id);
                            const isDisabled = isAssignedElsewhere || isAlreadySelected;
                            return (
                              <option 
                                key={emp.id} 
                                value={emp.id}
                                disabled={isDisabled}
                              >
                                {emp.name}
                                {isAlreadySelected ? ' (Already selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        
                        {/* Show selected employees list */}
                        {renderSelectedEmployeeChips(task.id, 'consulted')}
                        
                        {getSelectedEmployeesArray(task.id, 'consulted').length > 0 && (
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={getSelectedEmployeesArray(task.id, 'consulted').some(userId => financialLimits[`consulted-${task.id}-${userId}`])}
                                onChange={() => toggleFinancialLimit(task.id, 'consulted')}
                                className="mr-2"
                              />
                              <span className="text-sm">Financial Limit</span>
                            </label>
                            {financialLimits[`consulted-${task.id}-${getSelectedEmployeesArray(task.id, 'consulted')[0]}`] && (
                              <input
                                type="number"
                                min="0"
                                value={financialLimitValues[`consulted-${task.id}-${getSelectedEmployeesArray(task.id, 'consulted')[0]}`] || ''}
                                onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
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
                          value=""
                          onChange={(e) => {
                            handleEmployeeSelect(task.id, 'informed', e.target.value);
                            // Reset dropdown after selection
                            e.target.value = '';
                          }}
                          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Employee</option>
                          {getDisplayEmployees().map(emp => {
                            const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'informed', emp.id);
                            const isAlreadySelected = getSelectedEmployeesArray(task.id, 'informed').includes(emp.id);
                            const isDisabled = isAssignedElsewhere || isAlreadySelected;
                            return (
                              <option 
                                key={emp.id} 
                                value={emp.id}
                                disabled={isDisabled}
                              >
                                {emp.name}
                                {isAlreadySelected ? ' (Already selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        
                        {/* Show selected employees list */}
                        {renderSelectedEmployeeChips(task.id, 'informed')}
                        
                        {getSelectedEmployeesArray(task.id, 'informed').length > 0 && (
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={getSelectedEmployeesArray(task.id, 'informed').some(userId => financialLimits[`informed-${task.id}-${userId}`])}
                                onChange={() => toggleFinancialLimit(task.id, 'informed')}
                                className="mr-2"
                              />
                              <span className="text-sm">Financial Limit</span>
                            </label>
                            {financialLimits[`informed-${task.id}-${getSelectedEmployeesArray(task.id, 'informed')[0]}`] && (
                              <input
                                type="number"
                                min="0"
                                value={financialLimitValues[`informed-${task.id}-${getSelectedEmployeesArray(task.id, 'informed')[0]}`] || ''}
                                onChange={(e) => handleFinancialLimitChange(
                                          task.id, 
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
      
      setFilteredEmployees(employeesList);
      return employeesList;
    } catch (error) {
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
    
    // Also check approval status for currently selected event if any
    if (selectedEvent) {
      const checkInitialApprovalStatus = async () => {
        try {
          const approvalStatus = await raciService.getRACIApprovalStatus(selectedEvent);
          
          if (approvalStatus && approvalStatus.status) {
            const eventApprovalInfo = {
              status: approvalStatus.status,
              comments: approvalStatus.comments || '',
              approvers: approvalStatus.approvers || []
            };
            
            setEventApprovalData(prev => ({
              ...prev,
              [selectedEvent]: eventApprovalInfo
            }));
            
          }
        } catch (error) {
          // Could not fetch initial approval status
        }
      };
      
      checkInitialApprovalStatus();
    }
    
    // ...existing code...
  }, [selectedEvent]);

  // Add effect to load approval status when selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      const loadApprovalStatus = async () => {
        try {
          const approvalStatus = await raciService.getRACIApprovalStatus(selectedEvent);
          
          if (approvalStatus && approvalStatus.status) {
            const eventApprovalInfo = {
              status: approvalStatus.status,
              comments: approvalStatus.comments || '',
              approvers: approvalStatus.approvers || []
            };
            
            setEventApprovalData(prev => ({
              ...prev,
              [selectedEvent]: eventApprovalInfo
            }));
            
            // Force re-render to ensure UI updates
            setDropdownRefreshKey(prev => prev + 1);
          } else {
            // Clear any existing approval data if no status found
            setEventApprovalData(prev => {
              const { [selectedEvent]: _, ...rest } = prev;
              return rest;
            });
          }
        } catch (error) {
          // Could not fetch approval status
          // Clear approval data on error
          setEventApprovalData(prev => {
            const { [selectedEvent]: _, ...rest } = prev;
            return rest;
          });
        }
      };
      
      loadApprovalStatus();
    }
  }, [selectedEvent]);

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
      setExtraFinancialLimits({});
      // Reset change tracking for new event
      setOriginalRaciState(null);
      setRaciHasChanges(false);
      // Reset saved state for new event
      setRaciMatrixSaved(false);
      // Clear approval data for the previous event, not the new one
      setEventApprovalData(prev => {
        const { [selectedEvent]: _, ...rest } = prev;
        return rest;
      });
    }

    // Load approval status for the selected event
    if (eventId) {
      setTimeout(async () => {
        await fetchApprovalStatusWithRetry(eventId);
      }, 500);
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
          // Error fetching user data
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
      
      // Load RACI matrix data - this is handled by loadExistingRaciMatrix
      await loadExistingRaciMatrix(eventId);
      
    } catch (error) {
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

      // Try all possible endpoints (using proper API endpoints per documentation)
      const endpoints = [
        `/raci/events/${eventId}`,
        `/events/${eventId}/raci-matrix`,
        `/raci?eventId=${eventId}`
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
            return true;
          }
        } catch (error) {
          // Failed to check endpoint
        }
      }

      return false;
    } catch (error) {
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
    

    
    const newSelections = {
      responsible: {},
      accountable: {},
      consulted: {},
      informed: {}
    };

    // Extract financial limits including hierarchy levels using the corrected function
    const { financialLimitMap, financialLimitValueMap, extraFinancialLimitsMap } = extractFinancialLimitsFromRaciData(raciData);
    
    // CRITICAL: Verify we received hierarchy data from extraction
    
    // Process tasks and populate main level selections - SIMPLIFIED
    if (Array.isArray(raciData)) {
      // Handle array format from database
      const taskMap = new Map();
      const usersByTask = new Map(); // Track which users belong to which task/role for main selection
      
      raciData.forEach(assignment => {
        const taskId = String(assignment.task_id || assignment.taskId);
        const role = (assignment.role || '').toLowerCase();
        const userId = String(assignment.user_id || assignment.userId);
        const minLimit = Number(assignment.min_limit || 0);
        
        if (!taskId || !role || !userId) return;
        
        // Build task structure
        if (!taskMap.has(taskId)) {
          taskMap.set(taskId, {
            id: taskId,
            name: assignment.task_name || assignment.taskName || '',
            description: assignment.task_description || assignment.taskDescription || '',
            status: assignment.task_status || assignment.taskStatus || 'not_started'
          });
        }
        
        // CRITICAL: Only add to main selections if min_limit is 0 (main level users)
        if (minLimit === 0) {
          const taskUserKey = `${taskId}-${role}`;
          if (!usersByTask.has(taskUserKey)) {
            usersByTask.set(taskUserKey, []);
          }
          if (!usersByTask.get(taskUserKey).includes(userId)) {
            usersByTask.get(taskUserKey).push(userId);
          }
          
        } else {
          // HIERARCHY user - will be in hierarchy section
        }
      });
      
      // Populate main level selections
      usersByTask.forEach((userIds, taskUserKey) => {
        const [taskId, role] = taskUserKey.split('-');
        if (!newSelections[role]) newSelections[role] = {};
        newSelections[role][taskId] = userIds;
      });
      
      // Set tasks
      setTasks(Array.from(taskMap.values()));
      
    } else if (raciData.tasks) {
      // Handle new API format (when loading existing RACI data)
      setTasks(raciData.tasks);
      
      raciData.tasks.forEach(task => {
        const taskId = String(task.id);

        
        if (task.raci) {
          Object.entries(task.raci).forEach(([role, users]) => {
            if (!Array.isArray(users)) return;
            
            const groupKey = `${role.toLowerCase()}-${taskId}`;
            const mainLevelUsers = [];
            
            // Group users by level to create hierarchy structure
            const usersByLevel = {};
            
            users.forEach(user => {
              if (!user || !user.id) return;
              const userId = String(user.id);
              const userLevel = user.level || 1; // Default to level 1 if not specified
              
  
              
              if (userLevel === 1) {
                              // Level 1 users are main level
              mainLevelUsers.push(userId);
                
                // Add financial limits for main level users
                if (user.financialLimits) {
                  const mainKey = `${role.toLowerCase()}-${taskId}-${userId}`;
                  financialLimitMap[mainKey] = true;
                  financialLimitValueMap[mainKey] = String(user.financialLimits.max || user.financialLimits.min || 0);
                }
              } else {
                // Level > 1 users are hierarchy users
                if (!usersByLevel[userLevel]) {
                  usersByLevel[userLevel] = [];
                }
                usersByLevel[userLevel].push({
                  userId: userId,
                  amount: String(user.financialLimits?.max || user.financialLimits?.min || 0)
                });

              }
            });
            
            // Set main level users
            if (mainLevelUsers.length > 0) {
              if (!newSelections[role.toLowerCase()]) newSelections[role.toLowerCase()] = {};
              newSelections[role.toLowerCase()][taskId] = mainLevelUsers;
            }
            
            // Create hierarchy levels from grouped users
            if (Object.keys(usersByLevel).length > 0) {
              if (!extraFinancialLimitsMap[groupKey]) {
                extraFinancialLimitsMap[groupKey] = [];
              }
              
              // Sort levels and create hierarchy structure
              const sortedLevels = Object.keys(usersByLevel).sort((a, b) => Number(a) - Number(b));
              
              sortedLevels.forEach(level => {
                const levelUsers = usersByLevel[level];
                const levelIndex = extraFinancialLimitsMap[groupKey].length;
                
                // Group users by same amount (hierarchy level)
                const usersByAmount = {};
                levelUsers.forEach(userInfo => {
                  const amount = userInfo.amount;
                  if (!usersByAmount[amount]) {
                    usersByAmount[amount] = [];
                  }
                  usersByAmount[amount].push(userInfo.userId);
                });
                
                // Create hierarchy levels for each unique amount
                Object.entries(usersByAmount).forEach(([amount, userIds]) => {
                  extraFinancialLimitsMap[groupKey].push({
                    userIds: userIds,
                    amount: amount
                  });

                });
              });
            }
          });
        }
        
        
      });
    }
    

    
    // CRITICAL DEBUG: Check hierarchy data extraction results
    const hierarchyKeys = Object.keys(extraFinancialLimitsMap);
    if (hierarchyKeys.length > 0) {
      hierarchyKeys.forEach(key => {
        const levels = extraFinancialLimitsMap[key];
        
        // Check if we have employee data for all hierarchy users
        levels.forEach((level, idx) => {
                      if (level.userIds && level.userIds.length > 0) {
              level.userIds.forEach(userId => {
                const employeeFound = getDisplayEmployees().find(emp => emp.id === userId);
                if (!employeeFound) {
                  // Hierarchy user not found in employee list
                } else {
                  // Hierarchy user found in employee list
                }
              });
            }
        });
      });
    } else {
      // Check if any records had min_limit > 0
      if (Array.isArray(raciData)) {
        const hierarchyRecords = raciData.filter(assignment => {
          const minLimit = Number(assignment.min_limit || assignment.minLimit || assignment.min || 0);
          return minLimit > 0;
        });
      }
    }
    
    // FINAL DEBUG: Check what we're about to set in state
    
    // Verify no hierarchy users leaked into main selection
    Object.keys(newSelections).forEach(role => {
      Object.keys(newSelections[role] || {}).forEach(taskId => {
        const mainUsers = newSelections[role][taskId] || [];
        const hierarchyKey = `${role}-${taskId}`;
        const hierarchyLevels = extraFinancialLimitsMap[hierarchyKey] || [];
        
        mainUsers.forEach(userId => {
          // Check if this user also appears in hierarchy levels
          const foundInHierarchy = hierarchyLevels.some(level => 
            level.userIds && level.userIds.includes(userId)
          );
          if (foundInHierarchy) {
            // Error: User found in both main and hierarchy
          }
        });
      });
    });
    
    // Update state with the extracted data
    setSelectedEmployees(newSelections);
    setFinancialLimits(financialLimitMap);
    setFinancialLimitValues(financialLimitValueMap);
    setExtraFinancialLimits(extraFinancialLimitsMap);
    
    // Store original state for change detection
    setOriginalRaciState({
      selectedEmployees: newSelections,
      financialLimits: financialLimitMap,
      financialLimitValues: financialLimitValueMap,
      extraFinancialLimits: extraFinancialLimitsMap
    });
    setRaciHasChanges(false);
    
    // If we're loading existing data, consider it as saved
    setRaciMatrixSaved(true);
    
    // Store approval status data if available
    if (raciData.approvalStatus && raciData.hasApprovals) {
      const approvalInfo = {
        status: raciData.approvalStatus.overall === 'PENDING' ? 'PENDING_APPROVAL' : 
               raciData.approvalStatus.overall === 'APPROVED' ? 'APPROVED' : 
               raciData.approvalStatus.overall === 'REJECTED' ? 'REJECTED' : 'PENDING_APPROVAL',
        comments: '',
        approvers: raciData.approvalSummary ? raciData.approvalSummary.map(summary => ({
          userId: null,
          approvalLevel: summary.approval_level,
          name: summary.approver_name,
          email: summary.approver_email
        })) : [],
        approvalDate: raciData.approvalStatus.overall === 'APPROVED' ? new Date().toISOString() : null,
        rejectionReason: '',
        currentLevel: 1,
        totalLevels: raciData.approvalSummary ? raciData.approvalSummary.length : 2,
        submittedAt: new Date().toISOString(),
        // Add the detailed summary data
        approvalSummary: raciData.approvalStatus,
        levelSummary: raciData.approvalSummary,
        overallStatus: raciData.approvalStatus.overall
      };
      
      setEventApprovalData(prev => ({
        ...prev,
        [selectedEvent]: approvalInfo
      }));
    }
    
    // Debug what was actually set in state
    
    // Force refresh dropdowns to reflect the changes
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
      loadExistingRaciMatrix(selectedEvent);
    }
  }, [selectedEvent]);

  /* ------------------------------------------------------------------
     EXTRA (HIERARCHICAL) FINANCIAL LIMITS PER ROLE / TASK
     Structure: {
       `${role}-${taskId}`: [ { userIds: [], amount: '' }, ... ]
     }
  ------------------------------------------------------------------*/
  const [extraFinancialLimits, setExtraFinancialLimits] = useState({});

  // Debug effect to monitor extraFinancialLimits changes
  useEffect(() => {
    const totalLevels = Object.keys(extraFinancialLimits).reduce((sum, key) => {
      const levels = extraFinancialLimits[key] || [];
      return sum + levels.length;
    }, 0);
  }, [extraFinancialLimits]);

  // Effect to detect RACI changes
  useEffect(() => {
    if (originalRaciState && selectedEvent) {
      const currentState = {
        selectedEmployees,
        financialLimits,
        financialLimitValues,
        extraFinancialLimits
      };
      
      const hasChanges = JSON.stringify(currentState) !== JSON.stringify(originalRaciState);
      setRaciHasChanges(hasChanges);
      
      // Reset saved state when changes are detected
      if (hasChanges) {
        setRaciMatrixSaved(false);
      }
    }
  }, [selectedEmployees, financialLimits, financialLimitValues, extraFinancialLimits, originalRaciState, selectedEvent]);

  // Helper to add a blank extra limit row
  const addExtraFinancialLimitRow = (taskId, role) => {
    const key = `${role}-${taskId}`;
    setExtraFinancialLimits(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { userIds: [], amount: '' }]
    }));
  };

  const updateExtraLimitUser = (taskId, role, idx, userId) => {
    if (!userId) return;
    
    const key = `${role}-${taskId}`;
    setExtraFinancialLimits(prev => {
      const rows = [...(prev[key] || [])];
      const currentRow = rows[idx] || { userIds: [], amount: '' };
      
      // Add user to this hierarchy level if not already present
      if (!currentRow.userIds.includes(userId)) {
        currentRow.userIds = [...currentRow.userIds, userId];
      }
      
      rows[idx] = currentRow;
      return { ...prev, [key]: rows };
    });


  };

  // Function to remove an individual employee from a hierarchy level
  const removeEmployeeFromHierarchyLevel = (taskId, role, idx, userId) => {
    const key = `${role}-${taskId}`;
    setExtraFinancialLimits(prev => {
      const rows = [...(prev[key] || [])];
      const currentRow = rows[idx];
      if (currentRow && currentRow.userIds) {
        currentRow.userIds = currentRow.userIds.filter(id => id !== userId);
      }
      rows[idx] = currentRow;
      return { ...prev, [key]: rows };
    });
  };

  const updateExtraLimitAmount = (taskId, role, idx, amount) => {
    const key = `${role}-${taskId}`;
    // Allow any input - no automatic correction
    const sanitized = amount === '' ? '' : amount;

    setExtraFinancialLimits(prev => {
      const rows = [...(prev[key] || [])];
      rows[idx] = { ...rows[idx], amount: sanitized };
      return { ...prev, [key]: rows };
    });


  };

  // Function to remove an extra limit row
  const removeExtraLimitRow = (taskId, role, idx) => {
    const key = `${role}-${taskId}`;
    setExtraFinancialLimits(prev => {
      const rows = [...(prev[key] || [])];
      rows.splice(idx, 1);
      return { ...prev, [key]: rows };
    });
  };

  // On duplicate-prevention: determine if employee already chosen within all tiers for same role/task
  const isEmployeeInExtraRows = (taskId, role, employeeId) => {
    const key = `${role}-${taskId}`;
    const rows = extraFinancialLimits[key] || [];
    return rows.some(r => r.userIds && r.userIds.includes(employeeId));
  };

  // Render helper for extra rows inside cell with multiple employee support
  const renderExtraLimitRows = (task, role) => {
    const key = `${role}-${task.id}`;
    const rows = extraFinancialLimits[key] || [];
    


    return (
      <>
        {rows.map((row, idx) => {
          // Calculate minimum value for this tier
          let minVal = 0;
          if (idx === 0) {
            const selectedIds = getSelectedEmployeesArray(task.id, role);
            if (selectedIds.length > 0) {
              const primaryUserId = selectedIds[0];
              const primaryKey = `${role}-${task.id}-${primaryUserId}`;
              if (financialLimitValues[primaryKey]) minVal = Number(financialLimitValues[primaryKey]);
            }
          } else {
            minVal = Number(rows[idx - 1]?.amount || 0);
          }
          

          
          return (
          <div key={`extra-${key}-${idx}`} style={{ 
            marginTop: '0.75rem', 
            paddingTop: '0.75rem', 
            borderTop: '1px dashed #e5e7eb',
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden'
          }}>
             
             <div style={{ 
               display: 'flex', 
               alignItems: 'flex-start', 
               gap: '0.5rem',
               width: '100%',
               maxWidth: '100%'
             }}>
               <select
                 value=""
                 onChange={(e) => {
                   updateExtraLimitUser(task.id, role, idx, e.target.value);
                   e.target.value = '';
                 }}
                 style={{
                   flex: '1',
                   minWidth: '0',
                   padding: '0.5rem',
                   border: '1px solid #d1d5db',
                   borderRadius: '6px',
                   fontSize: '0.875rem'
                 }}
               >
                 <option value="">Select Employee</option>
                 {getDisplayEmployees().map(emp => {
                   // Exclude if already chosen in main selection OR in current row OR in other hierarchy rows
                   const inMainSelection = getSelectedEmployeesArray(task.id, role).includes(emp.id);
                   const inCurrentRow = row.userIds && row.userIds.includes(emp.id);
                   const inOtherHierarchyRow = rows.some((otherRow, otherIdx) => 
                     otherIdx !== idx && otherRow.userIds && otherRow.userIds.includes(emp.id)
                   );
                   const duplicate = inMainSelection || inCurrentRow || inOtherHierarchyRow;
                   
                   let disabledText = '';
                   if (inMainSelection) disabledText = ' (already in main selection)';
                   else if (inCurrentRow) disabledText = ' (already in this level)';
                   else if (inOtherHierarchyRow) disabledText = ' (already used in another level)';
                   
                   return (
                     <option key={`emp-${emp.id}`} value={emp.id} disabled={duplicate}>
                       {emp.name}{disabledText}
                     </option>
                   );
                 })}
               </select>
               <button
                 type="button"
                 onClick={() => removeExtraLimitRow(task.id, role, idx)}
                 style={{
                   padding: '0.5rem',
                   backgroundColor: '#fee2e2',
                   color: '#dc2626',
                   border: '1px solid #fca5a5',
                   borderRadius: '6px',
                   cursor: 'pointer',
                   fontSize: '0.875rem',
                   minWidth: '32px',
                   height: '40px',
                   flexShrink: 0
                 }}
                 title="Remove this limit level"
               >
                 ×
               </button>
             </div>
             
             {/* Show selected employees as chips for this hierarchy level */}
             {row.userIds && row.userIds.length > 0 && (
               <div style={{ 
                 display: 'flex', 
                 flexWrap: 'wrap', 
                 gap: '0.25rem', 
                 marginTop: '0.5rem',
                 width: '100%',
                 maxWidth: '100%'
               }}>
                 {row.userIds.map(userId => {
                   const employee = getDisplayEmployees().find(emp => emp.id === userId);
                   if (!employee) return null;
                   
                   return (
                     <span
                       key={`hierarchy-chip-${role}-${task.id}-${idx}-${userId}`}
                       style={{
                         display: 'inline-flex',
                         alignItems: 'center',
                         backgroundColor: '#e5e7eb',
                         color: '#374151',
                         fontSize: '0.75rem',
                         padding: '0.25rem 0.5rem',
                         borderRadius: '12px',
                         gap: '0.25rem',
                         maxWidth: '100%',
                         wordBreak: 'break-word'
                       }}
                     >
                       <span style={{ 
                         overflow: 'hidden', 
                         textOverflow: 'ellipsis', 
                         whiteSpace: 'nowrap',
                         maxWidth: '80px'
                       }}>
                         {employee.name}
                       </span>
                       <button
                         type="button"
                         onClick={() => removeEmployeeFromHierarchyLevel(task.id, role, idx, userId)}
                         style={{
                           background: 'none',
                           border: 'none',
                           color: '#dc2626',
                           fontWeight: 'bold',
                           fontSize: '0.875rem',
                           cursor: 'pointer',
                           padding: 0,
                           lineHeight: 1,
                           flexShrink: 0
                         }}
                         title={`Remove ${employee.name}`}
                       >
                         ×
                       </button>
                     </span>
                   );
                 })}
               </div>
             )}
             
             {(row.userIds && row.userIds.length > 0) && (
               <>
               {/* Display min boundary */}
               <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', marginTop: '0.5rem' }}>
                 Min: {minVal}
               </div>
               <input
                 type="number"
                 min={0}
                 placeholder={`Enter amount (must be > ${minVal})`}
                 value={row.amount}
                 onChange={(e) => updateExtraLimitAmount(task.id, role, idx, e.target.value)}
                 onBlur={(e) => {
                   const enteredAmount = Number(e.target.value);
                   if (enteredAmount <= minVal) {
                     alert(`Financial limit must be greater than ${minVal}. Please enter a valid amount.`);
                     updateExtraLimitAmount(task.id, role, idx, '');
                   }
                 }}
                 style={{
                   width: '100%',
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
            cursor: 'pointer',
            width: '100%'
          }}
        >
          + Select Another Employee
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

  // Helper function to get common financial limit value for a role
  const getCommonFinancialLimitValue = (taskId, role) => {
    const selectedIds = getSelectedEmployeesArray(taskId, role);
    if (selectedIds.length === 0) return '';
    
    // Get the value from the first selected user (they should all have the same value for main level)
    const firstUserId = selectedIds[0];
    const key = `${role}-${taskId}-${firstUserId}`;
    
    return financialLimitValues[key] || '';
  };

  // Helper function to check if editing should be disabled based on approval status
  const isEditingDisabled = () => {
    const currentEventApproval = eventApprovalData[selectedEvent];
    const approvalStatus = currentEventApproval?.status;
    
    // If there's approval data, check if all approvers have responded
    if (currentEventApproval?.levelSummary && Array.isArray(currentEventApproval.levelSummary)) {
      // Check if all approvers have given their response (approved or rejected)
      const totalApprovers = currentEventApproval.levelSummary.length;
      const respondedApprovers = currentEventApproval.levelSummary.filter(level => 
        level.status === 'APPROVED' || level.status === 'REJECTED'
      ).length;
      
      // Enable editing only when ALL approvers have responded (both have given response)
      return respondedApprovers < totalApprovers;
    }
    
    // Fallback to original logic for backward compatibility
    return approvalStatus && (
      approvalStatus === 'PENDING_APPROVAL' ||
      approvalStatus === 'SUBMITTED' ||
      approvalStatus === 'AWAITING_APPROVAL'
    );
  };

  // Function to fetch approval status from RACI approval system  
  const fetchApprovalStatusWithRetry = async (eventId, fallbackData = null) => {
    if (!eventId) return null;

    try {
      // Simple direct check - same way data was sent to DB
      const token = localStorage.getItem('raci_auth_token');
      if (!token) return null;

      const response = await fetch(`${env.apiBaseUrl}/raci/${eventId}/approval-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const statusData = await response.json();
        
        // Handle the new detailed approval status structure
        if (statusData && statusData.success && statusData.overallStatus) {
          const overallStatus = statusData.overallStatus;
          const summary = statusData.summary || {};
          const levelSummary = statusData.levelSummary || [];
          
          // Determine current level based on level summary
          let currentLevel = 1;
          let totalLevels = levelSummary.length || 2;
          
          // Find the current approval level (first level with pending items)
          for (let i = 0; i < levelSummary.length; i++) {
            const level = levelSummary[i];
            if (level.pending > 0) {
              currentLevel = level.level;
              break;
            }
          }
          
          // If all levels are complete, use the last level
          if (levelSummary.length > 0 && levelSummary.every(level => level.pending === 0)) {
            currentLevel = levelSummary[levelSummary.length - 1].level;
          }
          
          const approvalInfo = {
            status: overallStatus === 'PENDING' ? 'PENDING_APPROVAL' : 
                   overallStatus === 'APPROVED' ? 'APPROVED' : 
                   overallStatus === 'REJECTED' ? 'REJECTED' : 'PENDING_APPROVAL',
            comments: '',
            approvers: [],
            approvalDate: overallStatus === 'APPROVED' ? new Date().toISOString() : null,
            rejectionReason: '',
            currentLevel: currentLevel,
            totalLevels: totalLevels,
            submittedAt: statusData.createdAt || new Date().toISOString(),
            // Add the detailed summary data
            approvalSummary: summary,
            levelSummary: levelSummary,
            overallStatus: overallStatus
          };
          
          setEventApprovalData(prev => ({
            ...prev,
            [eventId]: approvalInfo
          }));
          
          return approvalInfo;
        }
        
        // Fallback to old structure for backward compatibility
        if (statusData && statusData.status === 'PENDING') {
          const approvalInfo = {
            status: 'PENDING_APPROVAL',
            comments: '',
            approvers: [],
            approvalDate: null,
            rejectionReason: '',
            currentLevel: 1,
            totalLevels: 2,
            submittedAt: statusData.createdAt || new Date().toISOString()
          };
          
          setEventApprovalData(prev => ({
            ...prev,
            [eventId]: approvalInfo
          }));
          
          return approvalInfo;
        }
      }
    } catch (error) {
      // Could not fetch approval status
    }

    try {
      // Check pending approvals table for this event
      const pendingApprovals = await raciService.getPendingRACIApprovals();
      console.log('API Response for pending approvals:', pendingApprovals);
      
      if (pendingApprovals) {
        // Handle different response formats
        let approvals = [];
        if (pendingApprovals.pendingApprovals) {
          approvals = pendingApprovals.pendingApprovals;
        } else if (Array.isArray(pendingApprovals)) {
          approvals = pendingApprovals;
        } else if (pendingApprovals.data) {
          approvals = pendingApprovals.data;
        }
        
        console.log('Extracted approvals array:', approvals);
        console.log('Looking for event ID:', eventId);
        
        // Look for this event in pending approvals  
        const eventApproval = approvals.find(approval => {
          const approvalEventId = approval.eventId || approval.event_id;
          console.log('Checking approval:', approval, 'Event ID:', approvalEventId);
          return approvalEventId && approvalEventId.toString() === eventId.toString();
        });
        
        if (eventApproval) {
          console.log('Found event approval:', eventApproval);
          const approvalInfo = {
            status: 'PENDING_APPROVAL',
            comments: '',
            approvers: [],
            approvalDate: null,
            rejectionReason: '',
            currentLevel: 1,
            totalLevels: 2,
            submittedAt: new Date().toISOString()
          };
          
          setEventApprovalData(prev => ({
            ...prev,
            [eventId]: approvalInfo
          }));
          
          return approvalInfo;
        } else {
          console.log('Event not found in approvals');
        }
      }
    } catch (error) {
      // Could not check pending approvals
    }

    return null;
  };



  // Function to render approval status in the column
  const renderApprovalStatus = () => {
    // Get event-specific approval data
    const currentEventApproval = eventApprovalData[selectedEvent];
    const approvalStatus = currentEventApproval?.status;
    const approvalComments = currentEventApproval?.comments;
    const selectedApprovers = currentEventApproval?.approvers || [];
    
    // Check if approval has been submitted (status exists and is not empty)
    // Hide submit button if status indicates submission or approval process has started
    const hasBeenSubmitted = approvalStatus && (
      approvalStatus === 'PENDING_APPROVAL' ||
      approvalStatus === 'SUBMITTED' ||
      approvalStatus === 'AWAITING_APPROVAL' ||
      approvalStatus === 'APPROVED' ||
      approvalStatus === 'COMPLETED' ||
      approvalStatus === 'REJECTED' ||
      approvalStatus === 'DECLINED' ||
      approvalStatus === 'PARTIALLY_APPROVED'
    );
    
    // Check if both approvers have responded and there are changes
    const bothApproversResponded = currentEventApproval?.levelSummary && 
      currentEventApproval.levelSummary.length === 2 &&
      currentEventApproval.levelSummary.every(level => 
        level.status === 'APPROVED' || level.status === 'REJECTED'
      );
    
    // Show submit button only if RACI matrix has been successfully saved and no submission yet
    // OR both approvers responded and changes detected and matrix has been saved
    if (raciMatrixSaved && (!hasBeenSubmitted || (bothApproversResponded && raciHasChanges))) {
      return (
        <button
          onClick={() => setShowApprovalModal(true)}
          className="btn btn-primary"
          style={{
            transition: 'all 0.2s',
            maxWidth: '90%',
            padding: '0.25rem 0.75rem',
            fontSize: '0.875rem',
            height: '40px',
            lineHeight: '1',
          }}
        >
          Submit for Approval
        </button>
      );
    }

    // If RACI matrix hasn't been saved yet, show a message
    if (!raciMatrixSaved && !hasBeenSubmitted) {
      return (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          Save the RACI matrix first to submit for approval
        </div>
      );
    }

    // Approval has been submitted - show status and approvers with full details
    const getStatusColor = (status, approvalData) => {
      // Check for rejections first
      const hasRejections = approvalData?.levelSummary && 
                           approvalData.levelSummary.some(level => level.status === 'REJECTED');
      
      if (hasRejections) {
        return { bg: '#fecaca', border: '#ef4444', text: '#dc2626' };
      }
      
      // Check if all approved (2/2)
      const allApproved = approvalData?.levelSummary && 
                         approvalData.levelSummary.length === 2 &&
                         approvalData.levelSummary.every(level => level.status === 'APPROVED');
      
      if (allApproved) {
        return { bg: '#d1fae5', border: '#10b981', text: '#065f46' };
      }
      
      // Check if we have partial approval
      const hasPartialApproval = approvalData?.levelSummary && 
                                 approvalData.levelSummary.some(level => level.status === 'APPROVED') && 
                                 approvalData.levelSummary.some(level => level.status === 'PENDING');
      
      if (hasPartialApproval && status === 'PENDING_APPROVAL') {
        return { bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' };
      }
      
      switch (status) {
        case 'PENDING_APPROVAL':
        case 'SUBMITTED':
        case 'AWAITING_APPROVAL':
          return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
        case 'APPROVED':
        case 'COMPLETED':
          return { bg: '#d1fae5', border: '#10b981', text: '#065f46' };
        case 'REJECTED':
        case 'DECLINED':
          return { bg: '#fecaca', border: '#ef4444', text: '#dc2626' };
        case 'PARTIALLY_APPROVED':
          return { bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' };
        default:
          return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' };
      }
    };

    const statusColors = getStatusColor(approvalStatus, currentEventApproval);
    
    // Calculate approved count (0/2 format)
    const approvedCount = currentEventApproval?.levelSummary ? 
      currentEventApproval.levelSummary.filter(level => level.status === 'APPROVED').length : 0;
    const totalApprovers = 2;
    
    const statusText = (() => {
      // Check for rejections first
      const hasRejections = currentEventApproval?.levelSummary && 
                           currentEventApproval.levelSummary.some(level => level.status === 'REJECTED');
      
      if (hasRejections) {
        return 'Rejected';
      }
      
      // Check for partial approval
      const hasPartialApproval = currentEventApproval?.levelSummary && 
                                 currentEventApproval.levelSummary.some(level => level.status === 'APPROVED') && 
                                 currentEventApproval.levelSummary.some(level => level.status === 'PENDING');
      
      if (hasPartialApproval && approvalStatus === 'PENDING_APPROVAL') {
        return 'Partially Approved';
      }
      
      // Check if all approved (2/2)
      const allApproved = currentEventApproval?.levelSummary && 
                         currentEventApproval.levelSummary.length === 2 &&
                         currentEventApproval.levelSummary.every(level => level.status === 'APPROVED');
      
      if (allApproved) {
        return 'Approved';
      }
      
      switch(approvalStatus) {
        case 'PENDING_APPROVAL':
        case 'SUBMITTED':
        case 'AWAITING_APPROVAL':
          return 'Pending Approval';
        case 'APPROVED':
        case 'COMPLETED':
          return 'Approved';
        case 'REJECTED':
        case 'DECLINED':
          return 'Rejected';
        case 'PARTIALLY_APPROVED':
          return 'Partially Approved';
        default:
          return approvalStatus || 'Unknown Status';
      }
    })();
    
    // Check if there are rejection reasons to show
    const hasRejectionReasons = currentEventApproval?.levelSummary && 
      currentEventApproval.levelSummary.some(level => 
        level.status === 'REJECTED' && (level.reason || level.remarks || level.comments)
      );

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Event ID Badge */}
        {(currentEventApproval.eventId || selectedEvent) && (
          <div style={{
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            color: '#374151',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.625rem',
            fontWeight: '600',
            width: '100%',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            📋 Event ID: {currentEventApproval.eventId || selectedEvent}
          </div>
        )}
        
        {/* Enhanced Status Badge with Overall Status */}
        <div style={{
          backgroundColor: statusColors.bg,
          border: `2px solid ${statusColors.border}`,
          color: statusColors.text,
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: '700',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textTransform: 'uppercase',
          letterSpacing: '0.025em'
        }}>
          {/* Show overall status prominently */}
          <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>
            {currentEventApproval.overallStatus || statusText}
          </div>
          {/* Show 0/2 format */}
          <div style={{ 
            fontSize: '0.625rem', 
            fontWeight: '500', 
            marginTop: '0.25rem',
            opacity: 0.9
          }}>
            {approvedCount}/{totalApprovers} Approved
          </div>
        </div>

        {/* Rejection Reason Button */}
        {/* {hasRejectionReasons && (
          <button
            onClick={() => setShowRejectionModal(true)}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: '500',
              cursor: 'pointer',
              width: '100%',
              marginTop: '0.5rem'
            }}
          >
            View Rejection Reason
          </button>
        )} */}

        {/* Approvers List */}
        {selectedApprovers && selectedApprovers.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: '#6b7280', width: '100%' }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
              Sent to:
            </div>
            {selectedApprovers.map((approver, index) => {
              // Find matching level summary for this approver
              const levelSummary = currentEventApproval.levelSummary?.find(level => level.approval_level === approver.approvalLevel);
              const approverStatus = levelSummary?.status || 'PENDING';
              // Check multiple possible field names for reason/remarks
              const approverReason = levelSummary?.reason || levelSummary?.remarks || levelSummary?.comments || '';
              
              // Determine background color based on status
              const getStatusColor = (status) => {
                switch(status) {
                  case 'APPROVED':
                    return { bg: '#f0fdf4', border: '#10b981', text: '#065f46' };
                  case 'REJECTED':
                    return { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' };
                  default:
                    return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' };
                }
              };
              
              const statusColors = getStatusColor(approverStatus);
              
              return (
                <div key={index} style={{ 
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: statusColors.bg,
                  borderRadius: '4px',
                  border: `1px solid ${statusColors.border}`
                }}>
                  <div style={{ 
                    fontWeight: '500', 
                    color: statusColors.text,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{approver.name}</span>
                    <span style={{ 
                      fontSize: '0.625rem',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '2px',
                      backgroundColor: statusColors.border,
                      color: 'white',
                      fontWeight: '600'
                    }}>
                      {approverStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: '0.125rem' }}>
                    Level {approver.approvalLevel}
                  </div>
                  {/* Show reason/remarks if available */}
                  {approverReason && approverReason.trim() && (
                    <div style={{ 
                      fontSize: '0.625rem', 
                      color: statusColors.text, 
                      marginTop: '0.25rem',
                      fontStyle: 'italic',
                      padding: '0.25rem',
                      backgroundColor: 'rgba(255,255,255,0.5)',
                      borderRadius: '2px',
                      border: '1px solid rgba(0,0,0,0.1)'
                    }}>
                      <strong>
                        {approverStatus === 'APPROVED' ? 'Remarks:' : 
                         approverStatus === 'REJECTED' ? 'Rejection Reason:' : 'Comments:'}
                      </strong> {approverReason}
                    </div>
                  )}
                  {/* Show message if no reason provided for approved items */}
                  {approverStatus === 'APPROVED' && (!approverReason || !approverReason.trim()) && (
                    <div style={{ 
                      fontSize: '0.625rem', 
                      color: '#9ca3af', 
                      marginTop: '0.25rem',
                      fontStyle: 'italic'
                    }}>
                      No remarks provided
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}



        {/* Fallback Progress Display */}
        {!currentEventApproval.approvalSummary && (currentEventApproval.currentLevel || currentEventApproval.totalLevels) && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280',
            padding: '0.375rem',
            backgroundColor: '#f8fafc',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
            width: '100%',
            marginBottom: '0.5rem'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Progress:</div>
            <div>Level {currentEventApproval.currentLevel || 1} of {currentEventApproval.totalLevels || 2}</div>
          </div>
        )}

        {/* Approval/Rejection Date */}
        {currentEventApproval.approvalDate && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280',
            padding: '0.375rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '4px',
            border: '1px solid #d1fae5',
            width: '100%',
            marginBottom: '0.5rem'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
              {approvalStatus === 'APPROVED' ? 'Approved On:' : 'Status Updated:'}
            </div>
            <div>{new Date(currentEventApproval.approvalDate).toLocaleDateString()}</div>
          </div>
        )}

        {/* Rejection Reason */}
        {(approvalStatus === 'REJECTED' || approvalStatus === 'DECLINED') && currentEventApproval.rejectionReason && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#dc2626',
            padding: '0.375rem',
            backgroundColor: '#fef2f2',
            borderRadius: '4px',
            border: '1px solid #fecaca',
            width: '100%',
            marginBottom: '0.5rem'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Rejection Reason:</div>
            <div>{currentEventApproval.rejectionReason}</div>
          </div>
        )}

        {/* Comments if any */}
        {approvalComments && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280',
            padding: '0.375rem',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
            width: '100%'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Comments:</div>
            <div>{approvalComments}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header">
        <h1>RACI Assignment</h1>
        <p>Create responsibility matrix for events</p>
      </div>
      


      {/* Error and Success Messages */}
      {error && (
        <div style={{
          backgroundColor: '#fecaca',
          border: '1px solid #ef4444',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{
          backgroundColor: '#d1fae5',
          border: '1px solid #10b981',
          color: '#065f46',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {success}
        </div>
      )}

      {/* Show editing disabled notification when approval is pending */}
      {isEditingDisabled() && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          color: '#92400e',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>🔒</span>
          <div>
            <strong>Editing Disabled:</strong> This RACI matrix has been submitted for approval and cannot be edited as approvers have started responding.
            <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', opacity: 0.8 }}>
              {(() => {
                const currentEventApproval = eventApprovalData[selectedEvent];
                if (currentEventApproval?.levelSummary) {
                  const responded = currentEventApproval.levelSummary.filter(level => 
                    level.status === 'APPROVED' || level.status === 'REJECTED'
                  ).length;
                  const total = currentEventApproval.levelSummary.length;
                  return `Response Status: ${responded}/${total} approvers have responded`;
                }
                return `Current Status: ${eventApprovalData[selectedEvent]?.status?.replace(/_/g, ' ')?.toLowerCase()?.replace(/\b\w/g, l => l.toUpperCase()) || 'Pending Approval'}`;
              })()}
            </div>
          </div>
        </div>
      )}



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
                      style={{ width: "16px", height: "16px" }}
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
                    <tbody className="bg-white divide-y divide-gray-200">
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
                                value=""
                                onChange={(e) => {
                                  handleEmployeeSelect(task.id, 'responsible', e.target.value);
                                  // Reset dropdown after selection
                                  e.target.value = '';
                                }}
                                disabled={isEditingDisabled()}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: getSelectedEmployeesArray(task.id, 'responsible').length > 0 ? '2px solid #2563eb' : '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  backgroundColor: isEditingDisabled() ? '#f3f4f6' : 'white',
                                  opacity: isEditingDisabled() ? 0.6 : 1,
                                  cursor: isEditingDisabled() ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <option value="">Select Employee</option>
                                {loadingEmployees ? (
                                  <option disabled>Loading employees...</option>
                                ) : (
                                  getDisplayEmployees().map((emp, index) => {
                                    const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'responsible', emp.id);
                                    const isAlreadySelected = getSelectedEmployeesArray(task.id, 'responsible').includes(emp.id);
                                    const isDisabled = isAssignedElsewhere || isAlreadySelected;
                                    return (
                                      <option 
                                        key={`emp-${emp.id}-${index}`} 
                                        value={emp.id}
                                        disabled={isDisabled}
                                        style={isAlreadySelected 
                                          ? { fontWeight: 'bold', backgroundColor: '#eff6ff' } 
                                          : isAssignedElsewhere 
                                          ? { color: '#9ca3af', fontStyle: 'italic' } 
                                          : {}
                                        }
                                      >
                                        {emp.name || 'Unknown'}
                                        {isAlreadySelected ? ' (Already selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                                      </option>
                                    );
                                  })
                                )}
                                {!loadingEmployees && getDisplayEmployees().length === 0 && (
                                  <option disabled>No employees available for this event</option>
                                )}
                              </select>

                        {/* Show selected employees list */}
                        {renderSelectedEmployeeChips(task.id, 'responsible')}

                        {/* Keep existing financial limit UI - show if any employees are selected */}
                        {getSelectedEmployeesArray(task.id, 'responsible').length > 0 && (
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
                                checked={getSelectedEmployeesArray(task.id, 'responsible').some(userId => financialLimits[`responsible-${task.id}-${userId}`])}
                                onChange={() => toggleFinancialLimit(task.id, 'responsible')}
                                disabled={isEditingDisabled()}
                                style={{ 
                                  marginRight: '0.5rem',
                                  opacity: isEditingDisabled() ? 0.6 : 1,
                                  cursor: isEditingDisabled() ? 'not-allowed' : 'pointer'
                                }}
                              />
                              Financial Limit
                            </label>
                            
                            {financialLimits[`responsible-${task.id}-${getSelectedEmployeesArray(task.id, 'responsible')[0]}`] && (
                              <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                                                  <input
                                    type="number"
                                    min="0"
                                    value={getCommonFinancialLimitValue(task.id, 'responsible')}
                                    onChange={(e) => handleFinancialLimitChange(task.id, 'responsible', e.target.value)}
                                    disabled={isEditingDisabled()}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      lineHeight: '1.25rem',
                                      backgroundColor: isEditingDisabled() ? '#f3f4f6' : 'white',
                                      marginTop: '0.5rem',
                                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                      opacity: isEditingDisabled() ? 0.6 : 1,
                                      cursor: isEditingDisabled() ? 'not-allowed' : 'text'
                                    }}
                                    placeholder="Enter limit"
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
                                value=""
                                onChange={(e) => {
                                  handleEmployeeSelect(task.id, 'accountable', e.target.value);
                                  // Reset dropdown after selection
                                  e.target.value = '';
                                }}
                                disabled={isEditingDisabled()}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: getSelectedEmployeesArray(task.id, 'accountable').length > 0 ? '2px solid #059669' : '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  backgroundColor: isEditingDisabled() ? '#f3f4f6' : (getSelectedEmployeesArray(task.id, 'accountable').length > 0 ? '#f0fdfa' : 'white'),
                                  opacity: isEditingDisabled() ? 0.6 : 1,
                                  cursor: isEditingDisabled() ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <option value="">Select Employee</option>
                                {loadingEmployees ? (
                                  <option disabled>Loading employees...</option>
                                ) : (
                                  getDisplayEmployees().map((emp, index) => {
                                    const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'accountable', emp.id);
                                    const isAlreadySelected = getSelectedEmployeesArray(task.id, 'accountable').includes(emp.id);
                                    const isDisabled = isAssignedElsewhere || isAlreadySelected;
                                    return (
                                      <option 
                                        key={`emp-${emp.id}-${index}`} 
                                        value={emp.id}
                                        disabled={isDisabled}
                                        style={isAlreadySelected 
                                          ? { fontWeight: 'bold', backgroundColor: '#ecfdf5' } 
                                          : isAssignedElsewhere 
                                          ? { color: '#9ca3af', fontStyle: 'italic' } 
                                          : {}
                                        }
                                      >
                                        {emp.name || 'Unknown'}
                                        {isAlreadySelected ? ' (Already selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                                      </option>
                                    );
                                  })
                                )}
                                {!loadingEmployees && getDisplayEmployees().length === 0 && (
                                  <option disabled>No employees available for this event</option>
                                )}
                              </select>
                              
                              {/* Show selected employees list */}
                              {renderSelectedEmployeeChips(task.id, 'accountable')}
                              
                              {getSelectedEmployeesArray(task.id, 'accountable').length > 0 && (
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
                                      checked={getSelectedEmployeesArray(task.id, 'accountable').some(userId => financialLimits[`accountable-${task.id}-${userId}`])}
                                      onChange={() => toggleFinancialLimit(task.id, 'accountable')}
                                      disabled={isEditingDisabled()}
                                      style={{ 
                                        marginRight: '0.5rem',
                                        opacity: isEditingDisabled() ? 0.6 : 1,
                                        cursor: isEditingDisabled() ? 'not-allowed' : 'pointer'
                                      }}
                                    />
                                    Financial Limit
                                  </label>
                                  
                                  {financialLimits[`accountable-${task.id}-${getSelectedEmployeesArray(task.id, 'accountable')[0]}`] && (
                                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                                                        <input
                                    type="number"
                                    min="0"
                                    value={getCommonFinancialLimitValue(task.id, 'accountable')}
                                    onChange={(e) => handleFinancialLimitChange(task.id, 'accountable', e.target.value)}
                                    disabled={isEditingDisabled()}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      lineHeight: '1.25rem',
                                      backgroundColor: isEditingDisabled() ? '#f3f4f6' : 'white',
                                      marginTop: '0.5rem',
                                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                      opacity: isEditingDisabled() ? 0.6 : 1,
                                      cursor: isEditingDisabled() ? 'not-allowed' : 'text'
                                    }}
                                    placeholder="Enter limit"
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
                                value=""
                                onChange={(e) => {
                                  handleEmployeeSelect(task.id, 'consulted', e.target.value);
                                  // Reset dropdown after selection
                                  e.target.value = '';
                                }}
                                disabled={isEditingDisabled()}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: getSelectedEmployeesArray(task.id, 'consulted').length > 0 ? '2px solid #d97706' : '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  backgroundColor: isEditingDisabled() ? '#f3f4f6' : (getSelectedEmployeesArray(task.id, 'consulted').length > 0 ? '#fef3c7' : 'white'),
                                  opacity: isEditingDisabled() ? 0.6 : 1,
                                  cursor: isEditingDisabled() ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <option value="">Select Employee</option>
                                {loadingEmployees ? (
                                  <option disabled>Loading employees...</option>
                                ) : (
                                  getDisplayEmployees().map((emp, index) => {
                                    const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'consulted', emp.id);
                                    const isAlreadySelected = getSelectedEmployeesArray(task.id, 'consulted').includes(emp.id);
                                    const isDisabled = isAssignedElsewhere || isAlreadySelected;
                                    return (
                                      <option 
                                        key={`emp-${emp.id}-${index}`} 
                                        value={emp.id}
                                        disabled={isDisabled}
                                        style={isAlreadySelected 
                                          ? { fontWeight: 'bold', backgroundColor: '#fef3c7' } 
                                          : isAssignedElsewhere 
                                          ? { color: '#9ca3af', fontStyle: 'italic' } 
                                          : {}
                                        }
                                      >
                                        {emp.name || 'Unknown'}
                                        {isAlreadySelected ? ' (Already selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                                      </option>
                                    );
                                  })
                                )}
                                {!loadingEmployees && getDisplayEmployees().length === 0 && (
                                  <option disabled>No employees available for this event</option>
                                )}
                              </select>
                              
                              {/* Show selected employees list */}
                              {renderSelectedEmployeeChips(task.id, 'consulted')}
                              
                              {getSelectedEmployeesArray(task.id, 'consulted').length > 0 && (
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
                                      checked={getSelectedEmployeesArray(task.id, 'consulted').some(userId => financialLimits[`consulted-${task.id}-${userId}`])}
                                      onChange={() => toggleFinancialLimit(task.id, 'consulted')}
                                      disabled={isEditingDisabled()}
                                      style={{ 
                                        marginRight: '0.5rem',
                                        opacity: isEditingDisabled() ? 0.6 : 1,
                                        cursor: isEditingDisabled() ? 'not-allowed' : 'pointer'
                                      }}
                                    />
                                    Financial Limit
                                  </label>
                                  
                                  {financialLimits[`consulted-${task.id}-${getSelectedEmployeesArray(task.id, 'consulted')[0]}`] && (
                                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                                                        <input
                                    type="number"
                                    min="0"
                                    value={getCommonFinancialLimitValue(task.id, 'consulted')}
                                    onChange={(e) => handleFinancialLimitChange(task.id, 'consulted', e.target.value)}
                                    disabled={isEditingDisabled()}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      lineHeight: '1.25rem',
                                      backgroundColor: isEditingDisabled() ? '#f3f4f6' : 'white',
                                      marginTop: '0.5rem',
                                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                      opacity: isEditingDisabled() ? 0.6 : 1,
                                      cursor: isEditingDisabled() ? 'not-allowed' : 'text'
                                    }}
                                    placeholder="Enter limit"
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
                                value=""
                                onChange={(e) => {
                                  handleEmployeeSelect(task.id, 'informed', e.target.value);
                                  // Reset dropdown after selection
                                  e.target.value = '';
                                }}
                                disabled={isEditingDisabled()}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: getSelectedEmployeesArray(task.id, 'informed').length > 0 ? '2px solid #7c3aed' : '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  backgroundColor: isEditingDisabled() ? '#f3f4f6' : (getSelectedEmployeesArray(task.id, 'informed').length > 0 ? '#f5f3ff' : 'white'),
                                  opacity: isEditingDisabled() ? 0.6 : 1,
                                  cursor: isEditingDisabled() ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <option value="">Select Employee</option>
                                {loadingEmployees ? (
                                  <option disabled>Loading employees...</option>
                                ) : (

                                  getDisplayEmployees().map((emp, index) => {
                                    const isAssignedElsewhere = isEmployeeAssignedElsewhere(task.id, 'informed', emp.id);
                                    const isAlreadySelected = getSelectedEmployeesArray(task.id, 'informed').includes(emp.id);
                                    const isDisabled = isAssignedElsewhere || isAlreadySelected;
                                    return (
                                      <option 
                                        key={`emp-${emp.id}-${index}`} 
                                        value={emp.id}
                                        disabled={isDisabled}
                                        style={isAlreadySelected 
                                          ? { fontWeight: 'bold', backgroundColor: '#f5f3ff' } 
                                          : isAssignedElsewhere 
                                          ? { color: '#9ca3af', fontStyle: 'italic' } 
                                          : {}
                                        }
                                      >
                                        {emp.name || 'Unknown'}
                                        {isAlreadySelected ? ' (Already selected)' : isAssignedElsewhere ? ' (assigned elsewhere)' : ''}
                                      </option>
                                    );
                                  })
                                )}
                                {!loadingEmployees && getDisplayEmployees().length === 0 && (
                                  <option disabled>No employees available for this event</option>
                                )}
                              </select>
                              
                              {/* Show selected employees list */}
                              {renderSelectedEmployeeChips(task.id, 'informed')}
                              
                              {getSelectedEmployeesArray(task.id, 'informed').length > 0 && (
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
                                      checked={getSelectedEmployeesArray(task.id, 'informed').some(userId => financialLimits[`informed-${task.id}-${userId}`])}
                                      onChange={() => toggleFinancialLimit(task.id, 'informed')}
                                      disabled={isEditingDisabled()}
                                      style={{ 
                                        marginRight: '0.5rem',
                                        opacity: isEditingDisabled() ? 0.6 : 1,
                                        cursor: isEditingDisabled() ? 'not-allowed' : 'pointer'
                                      }}
                                    />
                                    Financial Limit
                                  </label>
                                  
                                  {financialLimits[`informed-${task.id}-${getSelectedEmployeesArray(task.id, 'informed')[0]}`] && (
                                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                                                        <input
                                    type="number"
                                    min="0"
                                    value={getCommonFinancialLimitValue(task.id, 'informed')}
                                    onChange={(e) => handleFinancialLimitChange(task.id, 'informed', e.target.value)}
                                    disabled={isEditingDisabled()}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      lineHeight: '1.25rem',
                                      backgroundColor: isEditingDisabled() ? '#f3f4f6' : 'white',
                                      marginTop: '0.5rem',
                                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                      opacity: isEditingDisabled() ? 0.6 : 1,
                                      cursor: isEditingDisabled() ? 'not-allowed' : 'text'
                                    }}
                                    placeholder="Enter limit"
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
                          {/* Approval Status column */}
                          <td className="whitespace-nowrap text-sm text-gray-500 bg-purple-50" style={{
                            borderBottom: '1px solid #e5e7eb',
                            borderLeft: '1px solid #e5e7eb',
                            padding: '1rem',
                            textAlign: 'center'
                          }}>
                            {renderApprovalStatus()}
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
                    disabled={saving || isEditingDisabled()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: (saving || isEditingDisabled()) ? '#94a3b8' : '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: (saving || isEditingDisabled()) ? 'not-allowed' : 'pointer',
                      opacity: isEditingDisabled() ? 0.6 : 1
                    }}
                  >
                    {saving ? 'Saving...' : isEditingDisabled() ? 'Editing Disabled (Pending Approval)' : (existingDataFound ? 'Update RACI Matrix' : 'Save RACI Matrix')}
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
      
      {/* Rejection Reason Modal */}
      {showRejectionModal && (
        <div className="meeting-modal">
          <div className="modal-backdrop" onClick={() => setShowRejectionModal(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Rejection Reasons</h3>
            </div>
            <div className="modal-body">
              {(() => {
                const currentEventApproval = eventApprovalData[selectedEvent];
                const rejectedLevels = currentEventApproval?.levelSummary?.filter(level => 
                  level.status === 'REJECTED'
                ) || [];
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {rejectedLevels.map((level, index) => (
                      <div key={index} style={{
                        padding: '1rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#dc2626' }}>
                          Approver Level {level.approval_level}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                          <strong>Rejected by:</strong> {level.approver_name || 'Unknown Approver'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                          <strong>Reason:</strong> {level.reason || level.remarks || level.comments || 'No reason provided'}
                        </div>
                      </div>
                    ))}
                    {rejectedLevels.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                        No rejection reasons available
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowRejectionModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="meeting-modal">
          <div className="modal-backdrop" onClick={() => setShowApprovalModal(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Submit for Approval</h3>
            </div>
            <div className="modal-body">
              <p>Select exactly 2 employees who should approve this RACI matrix:</p>
              <div className="form-group">
                <div style={{ marginBottom: '1rem' }}>
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedEmployee = getDisplayEmployees().find(emp => emp.email === e.target.value);
                      if (selectedEmployee) {
                        setApprovalEmail(prev => {
                          const currentEmails = prev ? prev.split(',').map(email => email.trim()).filter(email => email) : [];
                          
                          // If email already exists, don't add it again
                          if (currentEmails.includes(selectedEmployee.email)) {
                            alert('This person is already selected');
                            return prev;
                          }
                          
                          // If we already have 2 people, don't add more
                          if (currentEmails.length >= 2) {
                            alert('You can only select exactly 2 people for approval');
                            return prev;
                          }
                          
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
                  <label>Selected Approvers (exactly 2 required):</label>
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}>
                    {approvalEmail ? approvalEmail.split(',').map((email, index) => {
                      const trimmedEmail = email.trim();
                      if (!trimmedEmail) return null;
                      const employee = getDisplayEmployees().find(emp => emp.email === trimmedEmail);
                      return (
                        <div key={index} style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db'
                        }}>
                          <span>{employee ? employee.name : trimmedEmail} ({trimmedEmail})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const emails = approvalEmail.split(',').map(e => e.trim()).filter(e => e);
                              emails.splice(index, 1);
                              setApprovalEmail(emails.join(', '));
                            }}
                            style={{
                              background: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.25rem 0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    }) : null}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: approvalEmail && approvalEmail.split(',').filter(e => e.trim()).length === 2 ? '#059669' : '#dc2626', 
                    marginTop: '0.5rem',
                    fontWeight: '500'
                  }}>
                    {approvalEmail ? 
                      `${approvalEmail.split(',').filter(e => e.trim()).length} of 2 people selected` :
                      'No people selected yet'
                    }
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
