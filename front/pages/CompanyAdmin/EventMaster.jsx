import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import eventService from '../../src/services/event.service';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

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

const EventMaster = () => {
  const navigate = useNavigate();
  const { id: editEventId } = useParams();
  const isEditMode = Boolean(editEventId);
  // State for event form
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    departmentId: '',
    division: '',
    priority: '',
    eventType: '',
    kpi: '',
    document: null,
    hod: '' // Added new HOD field
  });
  
  // Debug: Log initial form state
  console.log('Initial form state:', eventForm);
  
  // Debug: Log form state changes
  useEffect(() => {
    console.log('Form state updated:', eventForm);
    if (eventForm.kpi) {
      console.log('KPI field is set to:', eventForm.kpi);
    }
  }, [eventForm]);
  
  // State for selected employees
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  // State for departments and employees
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loadingDivs, setLoadingDivs] = useState(true);
  
  // State for loading indicators
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State for events listing
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  // State for error and success messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for company data
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  
  // State for expanded sections in sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: false,
    designations: false,
    locations: false,
    raci: true // Auto-expand RACI section
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
  
  // Load user and company data (consistent with Dashboard)
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        // Get current user
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        console.log("User data:", userData);
        
        if (userData && userData.company) {
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
              console.log('Company details:', mappedDetails);
              setCompanyData(mappedDetails);
              
              // Now fetch departments for this company
              fetchDepartmentsForCompany(mappedDetails.id);
              fetchDivisionsForCompany(mappedDetails.id);
            } else {
              console.warn(`Could not fetch company details, status: ${response.status}`);
              // Still set minimal company data from user object
              const fallbackData = {
                id: userData.company.id,
                name: userData.company.name || 'Your Company'
              };
              setCompanyData(fallbackData);
              
              // Try to fetch departments using the company ID from user object
              if (userData.company.id) {
                fetchDepartmentsForCompany(userData.company.id);
                fetchDivisionsForCompany(userData.company.id);
              }
            }
            
            // Also fetch events
            fetchEvents();
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            // Use fallback data
            const fallbackData = {
              id: userData.company.id,
              name: userData.company.name || 'Your Company'
            };
            setCompanyData(fallbackData);
            
            // Try to fetch departments using the company ID from user object
            if (userData.company.id) {
              fetchDepartmentsForCompany(userData.company.id);
              fetchDivisionsForCompany(userData.company.id);
            }
            setLoadingDepts(false);
          }
        } else {
          setLoadingDepts(false);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setLoadingDepts(false);
      } finally {
        setLoadingCompany(false);
      }
    };
    
    fetchUserAndCompany();
  }, []);
  
  // Fetch departments for company using correct endpoint
  const fetchDepartmentsForCompany = async (companyId) => {
    try {
      setLoadingDepts(true);
      setError('');
      console.log('Fetching departments for company:', companyId);
      
      // Using correct endpoint for departments
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}/departments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const deptData = await response.json();
      console.log('Raw departments response:', deptData);
      
      // Better handling of different API response formats
      let departmentsList = [];
      if (Array.isArray(deptData)) {
        departmentsList = deptData;
      } else if (deptData && Array.isArray(deptData.departments)) {
        departmentsList = deptData.departments;
      } else if (deptData && deptData.data && Array.isArray(deptData.data)) {
        departmentsList = deptData.data;
      }
      
      console.log('Processed departments list:', departmentsList);
      setDepartments(departmentsList);
      
      if (departmentsList.length === 0) {
        console.warn('No departments found for company:', companyId);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
      setError('Failed to load departments. Please refresh the page.');
    } finally {
      setLoadingDepts(false);
    }
  };
  
  // NEW: Fetch divisions for a company (mirrors departments logic)
  const fetchDivisionsForCompany = async (companyId) => {
    try {
      setLoadingDivs(true);
      console.log('Fetching divisions for company:', companyId);
      setError('');
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}/divisions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const divData = await response.json();
      console.log('Raw divisions response:', divData);
      let divisionsList = [];
      if (Array.isArray(divData)) {
        divisionsList = divData;
      } else if (divData && Array.isArray(divData.divisions)) {
        divisionsList = divData.divisions;
      } else if (divData && divData.data && Array.isArray(divData.data)) {
        divisionsList = divData.data;
      }
      setDivisions(divisionsList);
    } catch (err) {
      console.error('Failed to load divisions:', err);
      setDivisions([]); // graceful fallback
    } finally {
      setLoadingDivs(false);
    }
  };
  
  // Add new state for storing department HODs
  const [departmentHODs, setDepartmentHODs] = useState([]);
  const [selectedHODs, setSelectedHODs] = useState([]);
  
  // Add state to track current event status in edit mode
  const [currentEventStatus, setCurrentEventStatus] = useState(null);
  
  // Fetch employees for a specific department - Improved implementation
  const fetchEmployees = async (departmentId) => {
    if (!departmentId) {
      setFilteredEmployees([]);
      setDepartmentHODs([]);
      return;
    }
    
    try {
      setLoadingEmployees(true);
      setError('');
      
      // Use direct fetch for better debugging
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/departments/${departmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const departmentData = await response.json();
      console.log('Department data:', departmentData);
      
      if (departmentData && departmentData.employees) {
        // Set all employees
        setEmployees(departmentData.employees);
        setFilteredEmployees(departmentData.employees);
        console.log('Employees loaded:', departmentData.employees.length);
        
        // Find HODs in this department - look for employees with role: 'hod'
        const hods = departmentData.employees.filter(emp => emp.role === 'hod');
        console.log('Department HODs found:', hods);
        
        // If department has a main HOD, add it
        let finalHODs = [...hods];
        if (departmentData.hod) {
          if (!hods.some(h => h.id === departmentData.hod.id)) {
            finalHODs.push(departmentData.hod);
          }
        }
        
        setDepartmentHODs(finalHODs);
        console.log('Final Department HODs set:', finalHODs);
      } else {
        console.warn('No employees found in department');
        setEmployees([]);
        setFilteredEmployees([]);
        setDepartmentHODs([]);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
      setError('Failed to load employees for this department.');
      setEmployees([]);
      setFilteredEmployees([]);
      setDepartmentHODs([]);
    } finally {
      setLoadingEmployees(false);
    }
  };
  
  // Add handler for HOD selection
  const handleHODSelect = (event) => {
    const hodId = event.target.value;
    if (!hodId) return;
    // Prevent duplicates
    if (!selectedHODs.includes(hodId)) {
      const newHODs = [...selectedHODs, hodId];
      setSelectedHODs(newHODs);
      setEventForm(prev => ({
        ...prev,
        hod: newHODs.join(',')
      }));
    }
    // Reset dropdown to placeholder
    event.target.selectedIndex = 0;
  };
  
  // NEW: remove HOD from selection
  const removeHOD = (hodId) => {
    const newHODs = selectedHODs.filter(id => id !== hodId);
    setSelectedHODs(newHODs);
    setEventForm(prev => ({
      ...prev,
      hod: newHODs.join(',')
    }));
  };
  
  // Fetch events - Improved implementation
  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      setError('');
      
      // Use direct fetch for better debugging
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
      setError('Failed to load events. Please refresh the page.');
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };
  
  // Handle input change for the event form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    console.log('Form field changed:', name, value); // Debug log
    console.log('Previous form state:', eventForm);
    
    // Special debug for KPI field
    if (name === 'kpi') {
      console.log('=== KPI FIELD CHANGE DEBUG ===');
      console.log('KPI field name:', name);
      console.log('KPI field value:', value);
      console.log('KPI field value type:', typeof value);
      console.log('KPI field value length:', value ? value.length : 0);
      console.log('================================');
    }
    
    setEventForm(prev => {
      const newState = {
        ...prev,
        [name]: value
      };
      console.log('New form state:', newState);
      
      // Special debug for KPI field in new state
      if (name === 'kpi') {
        console.log('=== KPI FIELD IN NEW STATE ===');
        console.log('New state KPI value:', newState.kpi);
        console.log('New state KPI type:', typeof newState.kpi);
        console.log('==============================');
      }
      
      return newState;
    });
    
    // If department changes, fetch employees for that department
    if (name === 'departmentId' && value) {
      fetchEmployees(value);
    }
  };
  
  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEventForm(prev => ({
        ...prev,
        document: file
      }));
    }
  };
  
  // Handle employee selection
  const handleEmployeeSelect = (employeeId) => {
    const isSelected = selectedEmployees.includes(employeeId);
    
    if (isSelected) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };
  
  // Add these new state variables with your other state declarations
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeesPage, setEmployeesPage] = useState(1);
  const [employeesPerPage] = useState(10);
  
  // Add this function to filter employees based on search
  const getFilteredEmployees = () => {
    if (!employeeSearch.trim()) return filteredEmployees;
    
    return filteredEmployees.filter(emp => 
      emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) || 
      (emp.designation && emp.designation.toLowerCase().includes(employeeSearch.toLowerCase()))
    );
  };
  
  // Add this function to handle bulk selection of employees
  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      // If all are selected, deselect all
      setSelectedEmployees([]);
    } else {
      // Otherwise select all
      const allIds = filteredEmployees.map(emp => emp.id);
      setSelectedEmployees(allIds);
    }
  };
  
  // Add this function to get paginated employees
  const getPaginatedEmployees = () => {
    const filtered = getFilteredEmployees();
    const startIndex = (employeesPage - 1) * employeesPerPage;
    return filtered.slice(startIndex, startIndex + employeesPerPage);
  };
  
  // Add this function to handle page changes
  const handlePageChange = (newPage) => {
    setEmployeesPage(newPage);
  };
  
  // Add state for managing tasks
  const [eventTasks, setEventTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState({ 
    name: '', 
    description: '', 
    status: 'not_started' 
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  
  // Function to handle adding a new task
  const handleAddTask = () => {
    if (!currentTask.name.trim()) {
      alert('Task name is required');
      return;
    }
    
    if (editingTaskId !== null) {
      // Update existing task
      setEventTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === editingTaskId ? { ...currentTask, id: editingTaskId } : task
        )
      );
      setEditingTaskId(null);
    } else {
      // Add new task
      const newTask = {
        ...currentTask,
        id: Date.now() // Use timestamp as temporary ID
      };
      setEventTasks(prevTasks => [...prevTasks, newTask]);
    }
    
    // Reset form
    setCurrentTask({ name: '', description: '', status: 'not_started' });
    setShowTaskForm(false);
  };
  
  // Function to edit an existing task
  const handleEditTask = (task) => {
    setCurrentTask(task);
    setEditingTaskId(task.id);
    setShowTaskForm(true);
  };
  
  // Function to remove a task
  const handleRemoveTask = (taskId) => {
    setEventTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };
  
  // Add function for deleting an event
  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        setError('');
        const token = localStorage.getItem('raci_auth_token');
        const response = await fetch(`${env.apiBaseUrl}/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete event: ${response.status}`);
        }
        
        // Show success message
        setSuccess('Event deleted successfully');
        
        // Refresh events list
        fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        setError(error.message || 'Failed to delete event. Please try again.');
      }
    }
  };

  // Update the handleSubmitEvent function to ensure proper task formatting
  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!eventForm.name || !eventForm.departmentId) {
        throw new Error('Please fill in all required fields');
      }

      // Determine tasks payload
      const tasksPayload = (advancedVisible && eventSubtasks.length > 0)
        ? eventSubtasks.map(subtask => ({
            name: subtask.name,
            description: subtask.description || '',
            status: 'not_started'
          }))
        : [{
            name: eventForm.name,
            description: eventForm.description || '',
            status: 'not_started'
          }];

      // Debug: Log form values before creating eventData
      console.log('=== DEBUG: Form Values Before Submission ===');
      console.log('isEditMode:', isEditMode);
      console.log('eventForm.kpi:', eventForm.kpi);
      console.log('eventForm.kpi type:', typeof eventForm.kpi);
      console.log('eventForm.kpi length:', eventForm.kpi ? eventForm.kpi.length : 0);
      console.log('Full eventForm:', eventForm);
      console.log('===========================================');

      // Build payload respecting new API (omit empty optional fields)
      const eventData = {
        name: eventForm.name,
        description: eventForm.description || '',
        departmentId: eventForm.departmentId,
        priority: eventForm.priority || '',
        eventType: eventForm.eventType || '',
        kpi: eventForm.kpi || null, // Force include kpi field even if empty
        employees: selectedEmployees,
        tasks: tasksPayload,
        // In edit mode, preserve current status unless specifically changing it
        // In create mode, set default status to not_send_for_approval
        status: isEditMode && currentEventStatus ? currentEventStatus : 'not_send_for_approval'
      };

      // Add optional fields only if provided
      if (eventForm.division) {
        eventData.division = eventForm.division;
      }
      
      // Use selectedHODs if available, otherwise fall back to eventForm.hod
      if (selectedHODs.length > 0) {
        eventData.hod = selectedHODs.join(',');
      } else if (eventForm.hod) {
        eventData.hod = eventForm.hod;
      }

      console.log('Event data being sent:', JSON.stringify(eventData, null, 2));
      console.log('Form state before submission:', eventForm);
      console.log('kpi value:', eventForm.kpi);

      // For file uploads, we need to use FormData
      const formData = new FormData();
      
      // Add the document if it exists
      if (eventForm.document) {
        formData.append('document', eventForm.document);
      }
      
      // Add the JSON data as a string in the 'data' field
      // formData.append('data', JSON.stringify(eventData));

      // Alternative approach: append each field individually
      // Uncomment this section and comment out the above 'data' append if needed
      
      formData.append('name', eventForm.name);
      formData.append('description', eventForm.description || '');
      formData.append('departmentId', eventForm.departmentId);
      formData.append('priority', eventForm.priority || '');
      formData.append('eventType', eventForm.eventType || '');
      
      // Ensure KPI field is sent correctly for both create and edit
      const kpiValue = eventForm.kpi || '';
      formData.append('kpi', kpiValue);
      console.log('KPI field added to FormData:', kpiValue, '(type:', typeof kpiValue, ')');
      
      // Also try with snake_case in case backend expects it
      formData.append('kpi_relevance', eventForm.kpi || '');
      // Try other possible field names
      formData.append('kpiRelevance', eventForm.kpi || '');
      formData.append('kpi_type', eventForm.kpi || '');
      
      // Debug: Log all FormData entries
      console.log(`=== FormData contents (${isEditMode ? 'EDIT' : 'CREATE'} mode) ===`);
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }
      console.log('==========================================');
      
      // Add employees array
      if (selectedEmployees.length > 0) {
        formData.append('employees', JSON.stringify(selectedEmployees));
      }
      
      // Add tasks array with properly formatted tasks
      if (eventSubtasks.length > 0) {
        const tasksJson = JSON.stringify(eventSubtasks.map(subtask => ({
          name: subtask.name,
          description: subtask.description || '',
          status: 'not_started'
        })));
        console.log('Tasks JSON being sent:', tasksJson);
        formData.append('tasks', tasksJson);
      }
      

      const token = localStorage.getItem('raci_auth_token');
      
      // Determine method and URL based on edit mode
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode ? `${env.apiBaseUrl}/events/${editEventId}` : `${env.apiBaseUrl}/events`;
      
      console.log(`${isEditMode ? 'Updating' : 'Creating'} event using ${method} to ${url}`);
      console.log('Final form state before fetch:', eventForm);
      console.log('Final KPI value before fetch:', eventForm.kpi);
      
      let response;
      
      // Use different approaches for create vs edit to match working behavior
      if (isEditMode) {
        // Use FormData for edit (this works)
        response = await fetch(url, {
          method: method,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        // For create mode, build the request body explicitly to ensure all fields are included
        const createRequestBody = {
          name: eventForm.name,
          description: eventForm.description || '',
          departmentId: eventForm.departmentId,
          priority: eventForm.priority || '',
          eventType: eventForm.eventType || '',
          kpi: eventForm.kpi || '', // Explicitly include KPI field
          employees: selectedEmployees,
          tasks: tasksPayload,
          status: 'not_send_for_approval'
        };
        
        // Add optional fields
        if (eventForm.division) {
          createRequestBody.division = eventForm.division;
        }
        if (selectedHODs.length > 0) {
          createRequestBody.hod = selectedHODs.join(',');
        } else if (eventForm.hod) {
          createRequestBody.hod = eventForm.hod;
        }
        
        // Add optional fields
        if (eventForm.division) {
          createRequestBody.division = eventForm.division;
        }
        if (selectedHODs.length > 0) {
          createRequestBody.hod = selectedHODs.join(',');
        } else if (eventForm.hod) {
          createRequestBody.hod = eventForm.hod;
        }
        
        // Add multiple KPI field variations to ensure backend receives it
        if (eventForm.kpi) {
          createRequestBody.kpi_relevance = eventForm.kpi;
          createRequestBody.kpiRelevance = eventForm.kpi;
          createRequestBody.kpi_type = eventForm.kpi;
        }
        
        console.log('=== CREATE MODE - JSON REQUEST ===');
        console.log('eventForm.kpi:', eventForm.kpi);
        console.log('eventData.kpi:', eventData.kpi);
        console.log('createRequestBody.kpi:', createRequestBody.kpi);
        console.log('createRequestBody.kpi type:', typeof createRequestBody.kpi);
        console.log('createRequestBody has kpi:', 'kpi' in createRequestBody);
        console.log('Full JSON:', JSON.stringify(createRequestBody, null, 2));
        
        // Final verification - check if KPI field will be in the actual request
        const finalJson = JSON.stringify(createRequestBody);
        console.log('Final JSON string length:', finalJson.length);
        console.log('KPI field in JSON string:', finalJson.includes('"kpi"'));
        console.log('KPI value in JSON string:', finalJson.includes('"kpi":"KPI"'));
        console.log('==================================');
        
        // Force include KPI field one more time to be sure
        if (eventForm.kpi) {
          createRequestBody.kpi = eventForm.kpi;
          console.log('KPI field forced to:', createRequestBody.kpi);
        }
        
        response = await fetch(url, {
          method: method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createRequestBody)
        });
      }

      // Log the response for debugging
      const responseText = await response.text();
      console.log('Raw API response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid JSON response from server');
      }

      // Handle errors
      if (!response.ok) {
        throw new Error(data.message || `Failed to ${isEditMode ? 'update' : 'create'} event: ${response.status}`);
      }

      console.log(`Event ${isEditMode ? 'updated' : 'created'} successfully:`, data);
      setSuccess(`Event ${isEditMode ? 'updated' : 'created'} successfully!`);

      // Only reset form in create mode, not edit mode
      if (!isEditMode) {
        // Reset form
        setEventForm({
          name: '',
          description: '',
          departmentId: '',
          division: '',
          priority: '',
          eventType: '',
          kpi: '',
          document: null,
          hod: ''
        });
        setSelectedEmployees([]);
        setEventSubtasks([]);
        setSelectedHODs([]);
        
        // Reset file input
        const fileInput = document.getElementById('document');
        if (fileInput) fileInput.value = '';
      } else {
        // In edit mode, update the current event status locally
        setCurrentEventStatus(data.status || 'not_send_for_approval');
        
        // Update events list if available
        setEvents(prevEvents => prevEvents.map(event => 
          event.id === editEventId 
            ? { ...event, ...data, updatedAt: new Date().toISOString() } 
            : event
        ));
      }

      // Reload events list
      fetchEvents();

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} event:`, error);
      setError(error.message || `Failed to ${isEditMode ? 'update' : 'create'} event. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Make handleSubmit call handleSubmitEvent
  const handleSubmit = (e) => {
    handleSubmitEvent(e);
  };

  // Add state for subtasks in event creation
  const [eventSubtasks, setEventSubtasks] = useState([]);
  const [subtaskInput, setSubtaskInput] = useState({
    name: '',
    description: '',
    deadline: '',
    assignedTo: ''
  });

  // Handle subtask input changes - ensure this is defined before use
  const handleSubtaskInputChange = (e) => {
    const { name, value } = e.target;
    setSubtaskInput(prev => ({ ...prev, [name]: value }));
  };

  // Updated function to add subtasks to the event with proper format
  const addSubtaskToEvent = () => {
    if (!subtaskInput.name.trim()) {
      alert('Subtask name is required');
      return;
    }

    const newSubtask = {
      id: Date.now(), // Temporary ID for UI only
      name: subtaskInput.name.trim(), // Ensure name is trimmed
      description: subtaskInput.description ? subtaskInput.description.trim() : '',
      status: 'not_started', // Changed from 'pending' to 'not_started' to match API spec
      // Other UI-specific properties
      deadline: subtaskInput.deadline || '',
      assignedTo: subtaskInput.assignedTo || '',
      assignedToName: filteredEmployees.find(emp => emp.id === subtaskInput.assignedTo)?.name || ''
    };

    // Log to verify task structure
    console.log("Adding new subtask with correct status:", newSubtask);

    setEventSubtasks(prev => [...prev, newSubtask]);
    
    // Reset the subtask input form
    setSubtaskInput({
      name: '',
      description: '',
      deadline: '',
      assignedTo: ''
    });
  };

  // Add function to remove subtask from event
  const removeSubtaskFromEvent = (subtaskId) => {
    setEventSubtasks(prev => prev.filter(subtask => subtask.id !== subtaskId));
  };

  // Add the missing requestHODApproval function
  const requestHODApproval = async () => {
    if (!eventForm.departmentId) {
      setError('Please select a department first');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      // Logic to automatically set the department's HOD as the approver
      // You would typically make an API call here to set the approver
      
      // For now, just select all HODs in the department
      const allHODIds = departmentHODs.map(hod => hod.id);
      setSelectedHODs(allHODIds);
      setEventForm(prev => ({
        ...prev,
        hod: allHODIds.join(',')
      }));
      
      setSuccess('HOD approval requested successfully. The department HODs have been set as approvers.');
    } catch (error) {
      console.error('Error requesting HOD approval:', error);
      setError('Failed to request HOD approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add missing state for the separate subtask form (for existing events)
  const [subtaskForm, setSubtaskForm] = useState({
    name: '',
    description: '',
    eventId: '',
    deadline: '',
    assignedTo: ''
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [users, setUsers] = useState([]);

  // Fetch users for assignment
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };
  
  useEffect(() => {
    if (showSubtaskForm) {
      fetchUsers();
    }
  }, [showSubtaskForm]);

  // Handle subtask form changes
  const handleSubtaskChange = (e) => {
    const { name, value } = e.target;
    setSubtaskForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Open subtask form for a specific event
  const openSubtaskForm = (event) => {
    setSelectedEvent(event);
    setSubtaskForm(prev => ({ ...prev, eventId: event.id }));
    setShowSubtaskForm(true);
  };
  
  // Submit subtask
  const handleSubmitSubtask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Ensure we're including status in the subtask form data
      const subtaskData = {
        ...subtaskForm,
        status: 'not_started' // Explicitly add status as 'not_started'
      };

      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subtaskData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create subtask: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Subtask created:', responseData);
      setSuccess('Subtask created successfully!');
      
      // Reset form
      setSubtaskForm({
        name: '',
        description: '',
        eventId: selectedEvent?.id || '',
        deadline: '',
        assignedTo: ''
      });
      
      // Refresh events to show updated subtasks
      fetchEvents();
      setShowSubtaskForm(false);
    } catch (error) {
      console.error('Error creating subtask:', error);
      setError(error.message || 'Failed to create subtask. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render subtask form
  const renderSubtaskForm = () => {
    if (!showSubtaskForm || !selectedEvent) return null;
    
    return (
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Add Subtask to: {selectedEvent.name}</h3>
          <button 
            onClick={() => setShowSubtaskForm(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <span>×</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmitSubtask}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              value={subtaskForm.name}
              onChange={handleSubtaskChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={subtaskForm.description}
              onChange={handleSubtaskChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows="3"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Deadline</label>
            <input
              type="date"
              name="deadline"
              value={subtaskForm.deadline}
              onChange={handleSubtaskChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Assigned To</label>
            <select
              name="assignedTo"
              value={subtaskForm.assignedTo}
              onChange={handleSubtaskChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a user</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {submitting ? 'Adding...' : 'Add Subtask'}
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  // Add button to event list to add subtasks
  const renderEventList = () => {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Events</h3>
        {events.length === 0 ? (
          <p className="text-gray-500">No events found</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {events.map(event => (
              <li key={event.id} className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{event.name}</h4>
                    <p className="text-sm text-gray-500">{event.description}</p>
                  </div>
                  <button
                    onClick={() => openSubtaskForm(event)}
                    className="ml-2 bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700"
                  >
                    Add Subtask
                  </button>
                </div>
                
                {/* Show subtasks if any */}
                {event.subtasks && event.subtasks.length > 0 && (
                  <div className="mt-2 pl-4">
                    <p className="text-sm font-medium">Subtasks:</p>
                    <ul className="pl-4 list-disc">
                      {event.subtasks.map(subtask => (
                        <li key={subtask.id} className="text-sm">
                          {subtask.name} - Assigned to: {subtask.assignedToName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
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
              parent.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}</div>`;
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
            parent.innerHTML = `<div style=\"width: 100%; height: 100%; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;\">${currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</div>`;
          }}
        />
      );
    }
    return currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  };
  
  // When in edit mode, load existing event details
  useEffect(() => {
    if (!isEditMode) return;
    const loadEvent = async () => {
      try {
        const token = localStorage.getItem('raci_auth_token');
        const resp = await fetch(`${env.apiBaseUrl}/events/${editEventId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        if (!resp.ok) throw new Error('Failed fetching event');
        const data = await resp.json();
        
        // Set current event status for edit mode
        setCurrentEventStatus(data.status);
        
        setEventForm({
          name: data.name || '',
          description: data.description || '',
          departmentId: data.department?.id || '',
          division: data.division || '',
          priority: data.priority || '',
          eventType: data.eventType || '',
          kpi: data.kpi || '',
          document: null,
          hod: data.hod || ''
        });
        
        // NEW: Ensure previously selected employees are pre-selected in edit mode
        if (Array.isArray(data.employees) && data.employees.length > 0) {
          const ids = data.employees.map(emp => (typeof emp === 'object' && emp !== null ? emp.id : emp));
          setSelectedEmployees(ids);
        }
        // Load existing subtasks if present
        const subtasksArr = data.subtasks || data.tasks || [];
        if (Array.isArray(subtasksArr) && subtasksArr.length > 0) {
          setEventSubtasks(
            subtasksArr.map(st => ({
              id: st.id || Date.now(),
              name: st.name || st.title || '',
              assignedTo: st.assignedTo || st.assignedToName || '',
              description: st.description || ''
            }))
          );
        }
        // If department exists load employees list etc. and then set HODs
        if (data.department?.id) {
          await fetchEmployees(data.department.id);
          
          // Small delay to ensure department employees are fully loaded
          setTimeout(() => {
            // Load selected HODs after department employees are loaded
            if (data.hod) {
              const hodIds = data.hod.split(',').filter(id => id.trim());
              setSelectedHODs(hodIds);
              console.log('Loaded HODs for edit mode:', hodIds);
            }
          }, 100);
        }
      } catch (e) {
        console.error('Failed to load event details', e);
      }
    };
    loadEvent();
  }, [editEventId]);
  
  // NEW: Easter-egg toggle for advanced sections (subtasks & employee selection)
  const [headerClicks, setHeaderClicks] = useState(0);
  const [advancedVisible, setAdvancedVisible] = useState(false);

  // Handler to count clicks on "Create New Event" header
  const handleHeaderClick = () => {
    // Only applicable in create mode
    if (isEditMode) return;
    setHeaderClicks(prev => {
      const next = prev + 1;
      if (next >= 3) setAdvancedVisible(true);
      return next;
    });
  };
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  
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
                Event Master
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
        <div className="content-wrapper" style={{ padding: '2rem', margin: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>Create and manage events for your company</h2>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/company-admin/event-list')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              View All Events
            </button>
          </div>
      
      {/* Error and success messages */}
      {error && (
        <div className="alert alert-error" style={{ 
          padding: '0.75rem 1rem',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          borderRadius: '8px',
          marginBottom: '1.5rem' 
        }}>
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success" style={{ 
          padding: '0.75rem 1rem',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          borderRadius: '8px',
          marginBottom: '1.5rem' 
        }}>
          <span>{success}</span>
        </div>
      )}
            
            {/* Create Event Form */}
            <div className="card fix-card">
              <div className="card-header" style={{ 
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h2 onClick={handleHeaderClick} style={{ cursor: isEditMode ? 'default' : 'pointer' }}>
                  {isEditMode ? 'Edit Event' : 'Create New Event'}
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="form-grid fix-form">
                <div className="form-group">
                  <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>Event Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={eventForm.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter event name"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="departmentId" style={{ display: 'block', marginBottom: '0.5rem' }}>Department *</label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={eventForm.departmentId}
                    onChange={handleInputChange}
                    required
                    disabled={loadingDepts}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} {dept.hod ? `(HOD: ${dept.hod.name})` : ''}
                      </option>
                    ))}
                  </select>
                  {loadingDepts && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                      Loading departments...
                    </div>
                  )}
                  {!loadingDepts && departments.length === 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#b91c1c' }}>
                      No departments found. Please create a department first.
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="division" style={{ display: 'block', marginBottom: '0.5rem' }}>Division</label>
                  <select
                    id="division"
                    name="division"
                    value={eventForm.division}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select Division</option>
                    <option value="Plates & Chemicals (P&C)">Plates & Chemicals (P&C)</option>
                    <option value="Digital Print Media (DPM)">Digital Print Media (DPM)</option>
                    <option value="Trading">Trading</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="hod" style={{ display: 'block', marginBottom: '0.5rem' }}>HOD (Optional)</label>
                  {/* Selected HODs list shown on top, just below label */}
                  {selectedHODs.length > 0 && (
                    <div style={{ marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedHODs.map(id => {
                        const hodObj = departmentHODs.find(h => String(h.id) === String(id));
                        const label = hodObj ? hodObj.name : `HOD #${id}`;
                        console.log('Rendering HOD:', id, 'Found object:', hodObj, 'Available HODs:', departmentHODs);
                        return (
                          <span key={id} style={{
                            background: '#eef2ff',
                            color: '#3730a3',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {label}
                            <button type="button" onClick={() => removeHOD(id)} style={{
                              background: 'transparent',
                              border: 'none',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              color: '#6b7280'
                            }}>×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <select
                    id="hod"
                    name="hod"
                    onChange={handleHODSelect}
                    disabled={loadingEmployees || departmentHODs.length === 0}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select HOD</option>
                    {departmentHODs.map(hod => (
                      <option key={hod.id} value={hod.id}>
                        {hod.name} {hod.designation ? `(${hod.designation})` : '(HOD)'}
                      </option>
                    ))}
                  </select>

                  {departmentHODs.length === 0 && eventForm.departmentId && !loadingEmployees && (
                    <p style={{ fontSize: '0.875rem', color: '#b91c1c', marginTop: '0.25rem' }}>
                      No HODs found for this department. Please assign HODs in Department Management.
                    </p>
                  )}
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={eventForm.description}
                    onChange={handleInputChange}
                    placeholder="Enter event description"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      minHeight: '100px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="document" style={{ display: 'block', marginBottom: '0.5rem' }}>Document (Optional)</label>
                  <input
                    type="file"
                    id="document"
                    name="document"
                    onChange={handleFileChange}
                    style={{ width: '100%' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif"
                  />
                  
                  {/* Document Viewer */}
                  {eventForm.document && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      {/* Document Content Display */}
                      <div style={{
                        padding: '0.75rem',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '80px',
                        height: '80px'
                      }}>
                        {eventForm.document.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(eventForm.document)}
                            alt="Document preview"
                            style={{
                              maxWidth: '70px',
                              maxHeight: '70px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              const img = new Image();
                              img.src = URL.createObjectURL(eventForm.document);
                              const newWindow = window.open();
                              newWindow.document.write(`
                                <html>
                                  <head><title>Document Preview - ${eventForm.document.name}</title></head>
                                  <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6;">
                                    <img src="${img.src}" style="max-width: 90%; max-height: 90%; object-fit: contain;" />
                                  </body>
                                </html>
                              `);
                            }}
                          />
                        ) : eventForm.document.type.includes('pdf') ? (
                          <span style={{ fontSize: '2rem' }}>📄</span>
                        ) : eventForm.document.type.includes('word') || eventForm.document.name.includes('.doc') ? (
                          <span style={{ fontSize: '2rem' }}>📝</span>
                        ) : eventForm.document.type.includes('excel') || eventForm.document.name.includes('.xls') ? (
                          <span style={{ fontSize: '2rem' }}>📊</span>
                        ) : (
                          <span style={{ fontSize: '2rem' }}>📋</span>
                        )}
                      </div>
                      
                      {/* Document Name */}
                      <div style={{ 
                        flex: 1,
                        fontWeight: '500', 
                        fontSize: '0.875rem',
                        color: '#111827',
                        wordBreak: 'break-word'
                      }}>
                        {eventForm.document.name}
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm(prev => ({ ...prev, document: null }));
                          const fileInput = document.getElementById('document');
                          if (fileInput) fileInput.value = '';
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: '#fee2e2',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          color: '#b91c1c'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Upload any relevant documentation for this event (PDF, Word, Excel, Images, etc.)
                  </p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="priority" style={{ display: 'block', marginBottom: '0.5rem' }}>Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={eventForm.priority}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="eventType" style={{ display: 'block', marginBottom: '0.5rem' }}>Type of Event</label>
                  <select
                    id="eventType"
                    name="eventType"
                    value={eventForm.eventType}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select Type of Event</option>
                    <option value="Operational Event">Operational Event</option>
                    <option value="Strategic Event">Strategic Event</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="kpi" style={{ display: 'block', marginBottom: '0.5rem' }}>KPI Relevance</label>
                  <select
                    id="kpi"
                    name="kpi"
                    value={eventForm.kpi}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select KPI Relevance</option>
                    <option value="KPI">KPI</option>
                    <option value="Non KPI">Non KPI</option>
                  </select>
                </div>
                
                {/* Simple Subtask Section (hidden until 3 header clicks) */}
                {advancedVisible && (
                <div className="form-group" style={{ 
                  gridColumn: '1 / -1',
                  marginTop: '1rem',
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb'
                }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '1rem',
                    fontWeight: '600',
                    fontSize: '1rem',
                    color: '#4f46e5'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>📋</span> 
                    Add Subtasks
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                    <input
                      type="text"
                      name="name"
                      value={subtaskInput.name}
                      onChange={handleSubtaskInputChange}
                      placeholder="Enter subtask name"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}
                    />
                    <textarea
                      name="description"
                      value={subtaskInput.description}
                      onChange={handleSubtaskInputChange}
                      placeholder="Enter subtask description (optional)"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        type="button"
                        onClick={addSubtaskToEvent}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Add Subtask
                      </button>
                    </div>
                  </div>
                  
                  {eventSubtasks.length > 0 && (
                    <div style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      backgroundColor: 'white' 
                    }}>
                      {eventSubtasks.map(subtask => (
                        <div 
                          key={subtask.id}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{flex: 1}}>
                            <div style={{fontWeight: '500'}}>{subtask.name}</div>
                            {subtask.description && (
                              <div style={{
                                fontSize: '0.8125rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
                              }}>{subtask.description}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSubtaskFromEvent(subtask.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              color: '#b91c1c',
                              marginLeft: '1rem'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}
                
                {eventForm.departmentId && advancedVisible && (
                  <div className="form-group" style={{ 
                    gridColumn: '1 / -1',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.75rem' 
                    }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        fontWeight: '500',
                        fontSize: '1rem'
                      }}>
                        <span style={{ marginRight: '0.5rem' }}>👥</span> 
                        Select Employees
                        {!loadingEmployees && filteredEmployees.length > 0 && (
                          <span style={{ 
                            marginLeft: '0.75rem',
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            fontWeight: 'normal'
                          }}>
                            {selectedEmployees.length} of {filteredEmployees.length} selected
                          </span>
                        )}
                      </label>

                      {filteredEmployees.length > 0 && (
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <button
                            type="button"
                            onClick={handleSelectAllEmployees}
                            style={{
                              padding: '0.375rem 0.75rem',
                              background: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {selectedEmployees.length === filteredEmployees.length 
                              ? 'Deselect All' 
                              : 'Select All'}
                          </button>

                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              value={employeeSearch}
                              onChange={(e) => setEmployeeSearch(e.target.value)}
                              placeholder="Search employees..."
                              style={{
                                padding: '0.5rem 0.75rem',
                                paddingLeft: '2rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                width: '200px'
                              }}
                            />
                            <span style={{
                              position: 'absolute',
                              left: '0.5rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#9ca3af',
                              pointerEvents: 'none'
                            }}>
                              🔍
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {loadingEmployees ? (
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ 
                          width: '24px',
                          height: '24px',
                          border: '3px solid #e5e7eb',
                          borderTopColor: '#6366f1',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginRight: '0.75rem'
                        }}></div>
                        <p style={{ fontWeight: '500', color: '#6b7280' }}>Loading employees...</p>
                      </div>
                    ) : filteredEmployees.length > 0 ? (
                      <>
                        <div style={{ 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}>
                          <div className="employee-list" style={{ 
                            maxHeight: '350px',
                            overflowY: 'auto',
                            backgroundColor: 'white'
                          }}>
                            {getFilteredEmployees().length === 0 ? (
                              <div style={{ 
                                padding: '2rem',
                                textAlign: 'center',
                                color: '#6b7280'
                              }}>
                                <p>No employees match your search</p>
                              </div>
                            ) : (
                              getPaginatedEmployees().map(emp => (
                                <div 
                                  key={emp.id}
                                  className={`employee-item ${selectedEmployees.includes(emp.id) ? 'selected' : ''}`}
                                  style={{
                                    padding: '0.875rem 1rem',
                                    borderBottom: '1px solid #f3f4f6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'background-color 0.1s ease',
                                    backgroundColor: selectedEmployees.includes(emp.id) ? '#f0f7ff' : 'white',
                                    cursor: 'pointer',
                                    position: 'relative'
                                  }}
                                  onClick={() => handleEmployeeSelect(emp.id)}
                                >
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    width: '100%',
                                    position: 'relative'
                                  }}>
                                    <div style={{ 
                                      marginRight: '0.875rem',
                                      position: 'relative'
                                    }}>
                                      <input 
                                        type="checkbox"
                                        checked={selectedEmployees.includes(emp.id)}
                                        onChange={() => {}}
                                        style={{ 
                                          width: '1.125rem',
                                          height: '1.125rem',
                                          borderRadius: '4px',
                                          cursor: 'pointer'
                                        }}
                                      />
                                      {selectedEmployees.includes(emp.id) && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '-6px',
                                          right: '-6px',
                                          width: '14px',
                                          height: '14px',
                                          backgroundColor: '#4f46e5',
                                          borderRadius: '50%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '8px',
                                          color: 'white',
                                          fontWeight: 'bold'
                                        }}>
                                          ✓
                                        </div>
                                      )}
                                    </div>

                                    <div style={{ flex: '1' }}>
                                      <div style={{ 
                                        fontWeight: selectedEmployees.includes(emp.id) ? '600' : '500',
                                        color: selectedEmployees.includes(emp.id) ? '#1e40af' : '#111827',
                                        fontSize: '0.9375rem',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}>
                                        {emp.name}
                                        {selectedEmployees.includes(emp.id) && (
                                          <span style={{ 
                                            marginLeft: '0.5rem',
                                            fontSize: '0.75rem',
                                            backgroundColor: '#dbeafe',
                                            color: '#2563eb',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '9999px'
                                          }}>
                                            Selected
                                          </span>
                                        )}
                                      </div>
                                      
                                      {emp.designation && (
                                        <div style={{ 
                                          fontSize: '0.8125rem', 
                                          color: '#6b7280',
                                          marginTop: '0.25rem'
                                        }}>
                                          {emp.designation}
                                        </div>
                                      )}
                                    </div>

                                    {emp.role && (
                                      <div style={{
                                        fontSize: '0.75rem',
                                        color: '#4b5563',
                                        backgroundColor: '#f3f4f6',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '4px',
                                        marginLeft: '0.5rem'
                                      }}>
                                        {emp.role === 'hod' ? 'HOD' : emp.role === 'company_admin' ? 'Admin' : 'User'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          
                          {/* Pagination controls */}
                          {getFilteredEmployees().length > employeesPerPage && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: '0.75rem',
                              borderTop: '1px solid #e5e7eb',
                              gap: '0.5rem'
                            }}>
                              {Array.from({ length: Math.ceil(getFilteredEmployees().length / employeesPerPage) }).map((_, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handlePageChange(index + 1)}
                                  style={{
                                    width: '2rem',
                                    height: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '0.375rem',
                                    border: employeesPage === index + 1 ? 'none' : '1px solid #d1d5db',
                                    backgroundColor: employeesPage === index + 1 ? '#4f46e5' : 'white',
                                    color: employeesPage === index + 1 ? 'white' : '#4b5563',
                                    fontWeight: employeesPage === index + 1 ? '600' : 'normal',
                                    cursor: employeesPage === index + 1 ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  {index + 1}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {selectedEmployees.length > 0 && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.75rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ fontWeight: '500', fontSize: '0.875rem', color: '#4b5563' }}>
                              {selectedEmployees.length} {selectedEmployees.length === 1 ? 'employee' : 'employees'} selected
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedEmployees([])}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                              }}
                            >
                              Clear Selection
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ 
                        padding: '2rem',
                        textAlign: 'center',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                        <p style={{ fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                          No employees found in this department
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          Please add employees to this department or select a different department.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="form-actions" style={{
                  marginTop: '20px', 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: '12px',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '1.25rem',
                  gridColumn: '1 / -1'
                }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (isEditMode) {
                        // In edit mode, go back to event list
                        navigate('/company-admin/event-list');
                      } else {
                        // In create mode, reset form
                        setEventForm({
                          name: '',
                          description: '',
                          departmentId: '',
                          division: '',
                          priority: '',
                          eventType: '',
                          kpi: '', // Add KPI field to reset
                          document: null,
                          hod: ''
                        });
                        setSelectedEmployees([]);
                        setEventSubtasks([]);
                        setSelectedHODs([]);
                        setError('');
                        setSuccess('');
                        
                        // Reset file input
                        const fileInput = document.getElementById('document');
                        if (fileInput) fileInput.value = '';
                      }
                    }}
                    style={{ 
                      padding: '0.75rem 1.25rem', 
                      background: '#f3f4f6', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    {isEditMode ? 'Cancel' : 'Reset'}
                  </button>
                  
                  {isEditMode ? (
                    // Edit mode buttons
                    <>
                      {/* Regular Update button for non-rejected events */}
                      {currentEventStatus !== 'rejected' && (
                        <button 
                          type="submit" 
                          disabled={submitting}
                          style={{ 
                            padding: '0.75rem 1.5rem', 
                            background: submitting ? '#94a3b8' : '#4f46e5', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px',
                            fontWeight: '500',
                            cursor: submitting ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {submitting ? 'Updating...' : 'Update Event'}
                        </button>
                      )}
                      
                      {/* Edit and Resend for Approval button - only for rejected events */}
                      {currentEventStatus === 'rejected' && (
                        <button 
                          type="button" 
                          disabled={submitting}
                          onClick={async (e) => {
                            e.preventDefault();
                            
                            // Validate required fields
                            if (!eventForm.name.trim()) {
                              setError('Event name is required');
                              return;
                            }
                            if (!eventForm.departmentId) {
                              setError('Please select a department');
                              return;
                            }
                            if (selectedHODs.length === 0) {
                              setError('Please select at least one HOD for approval');
                              return;
                            }

                            try {
                              setSubmitting(true);
                              setError('');
                              
                                                          // Update the event with approval status
                            console.log('Selected HODs for resend:', selectedHODs);
                            console.log('Current event form data:', eventForm);
                            
                            const eventData = {
                              name: eventForm.name,
                              description: eventForm.description || '',
                              departmentId: eventForm.departmentId,
                              priority: eventForm.priority || '',
                              eventType: eventForm.eventType || '',
                              kpi: eventForm.kpi || '', // Add KPI field
                              employees: selectedEmployees,
                              tasks: eventSubtasks.length > 0 
                                ? eventSubtasks.map(subtask => ({
                                    name: subtask.name,
                                    description: subtask.description || '',
                                    status: 'not_started'
                                  }))
                                : [{
                                    name: eventForm.name,
                                    description: eventForm.description || '',
                                    status: 'not_started'
                                  }],
                              hod: selectedHODs.join(',') // Use selected HODs instead of eventForm.hod
                            };
                            
                            console.log('Sending event data for update:', JSON.stringify(eventData, null, 2));

                              // Add optional fields only if provided
                              if (eventForm.division) {
                                eventData.division = eventForm.division;
                              }

                              const formData = new FormData();
                              
                              // Add the document if it exists
                              if (eventForm.document) {
                                formData.append('document', eventForm.document);
                              }
                              
                              // Add the JSON data as a string in the 'data' field
                              formData.append('data', JSON.stringify(eventData));
                              
                              // Also add KPI field individually to ensure it's captured
                              if (eventForm.kpi) {
                                formData.append('kpi', eventForm.kpi);
                              }

                              const token = localStorage.getItem('raci_auth_token');
                              
                              // Update event with approval status
                              let response;
                              if (eventForm.document) {
                                response = await fetch(`${env.apiBaseUrl}/events/${editEventId}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Authorization': `Bearer ${token}`
                                  },
                                  body: formData
                                });
                              } else {
                                response = await fetch(`${env.apiBaseUrl}/events/${editEventId}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify(eventData)
                                });
                              }

                              const responseText = await response.text();
                              console.log('Raw backend response:', responseText);
                              console.log('Response status:', response.status);
                              console.log('Response headers:', [...response.headers.entries()]);
                              
                              let data;
                              try {
                                data = JSON.parse(responseText);
                              } catch (e) {
                                console.error('Failed to parse response as JSON:', e);
                                throw new Error(`Invalid JSON response from server. Response: ${responseText.substring(0, 200)}`);
                              }

                              if (!response.ok) {
                                console.error('Backend returned error:', data);
                                throw new Error(data.message || `Failed to update event: ${response.status}`);
                              }

                              console.log('Event updated successfully:', data);
                              
                              // Now send for approval using the event service
                              console.log('Sending event for approval...');
                              
                              // Get the first selected HOD's email for the API call
                              const firstHodObj = departmentHODs.find(h => String(h.id) === String(selectedHODs[0]));
                              if (!firstHodObj || !firstHodObj.email) {
                                throw new Error('Selected HOD email not found');
                              }
                              
                              await eventService.submitEventForApproval(editEventId, firstHodObj.email);
                              console.log('Event sent for approval successfully');
                              // Don't show success message here - will show in EventList after navigation
                              setCurrentEventStatus('pending'); // Update local status

                              // Also update the event in the current events list if it exists with current timestamp
                              const currentTimestamp = new Date().toISOString();
                              setEvents(prevEvents => prevEvents.map(event => 
                                event.id === editEventId 
                                  ? { 
                                      ...event, 
                                      status: 'pending', 
                                      updatedAt: currentTimestamp,
                                      modifiedAt: currentTimestamp, // Add modifiedAt as well
                                      lastModified: currentTimestamp // Add lastModified for extra coverage
                                    } 
                                  : event
                              ));

                              // Wait a bit for backend to process, then navigate with explicit refresh
                              setTimeout(() => {
                                navigate('/company-admin/event-list', { 
                                  state: { 
                                    refresh: true, 
                                    message: 'Event updated and sent for approval successfully!',
                                    forceRefresh: true,
                                    timestamp: Date.now(), // Force different state
                                    updatedEventId: editEventId // Include event ID for targeting
                                  }
                                });
                              }, 500);
                              
                            } catch (err) {
                              console.error('Error updating event and sending for approval:', err);
                              setError('Failed to update event and send for approval. Please try again.');
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          style={{ 
                            padding: '0.75rem 1.5rem', 
                            background: submitting ? '#94a3b8' : '#16a34a', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px',
                            fontWeight: '500',
                            cursor: submitting ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {submitting ? 'Updating and Sending for Approval...' : 'Edit and Resend for Approval'}
                        </button>
                      )}
                    </>
                  ) : (
                    // Create mode button
                    <button 
                      type="button" 
                      disabled={submitting}
                      onClick={async (e) => {
                        e.preventDefault();
                        
                        // Validate required fields
                        if (!eventForm.name.trim()) {
                          setError('Event name is required');
                          return;
                        }
                        if (!eventForm.departmentId) {
                          setError('Please select a department');
                          return;
                        }
                        if (selectedHODs.length === 0) {
                          setError('Please select at least one HOD for approval');
                          return;
                        }

                        try {
                          setSubmitting(true);
                          setError('');
                          
                          // Create the event first
                          const eventData = {
                            name: eventForm.name,
                            description: eventForm.description || '',
                            departmentId: eventForm.departmentId,
                            priority: eventForm.priority || '',
                            eventType: eventForm.eventType || '',
                            kpi: eventForm.kpi || '', // Add KPI field
                            employees: selectedEmployees,
                            tasks: eventSubtasks.length > 0 
                              ? eventSubtasks.map(subtask => ({
                                  name: subtask.name,
                                  description: subtask.description || '',
                                  status: 'not_started'
                                }))
                              : [{
                                  name: eventForm.name,
                                  description: eventForm.description || '',
                                  status: 'not_started'
                                }],
                            hod: selectedHODs.join(',') // Use selected HODs instead of eventForm.hod
                          };

                          // Add optional fields only if provided
                          if (eventForm.division) {
                            eventData.division = eventForm.division;
                          }

                          const formData = new FormData();
                          
                          // Add the document if it exists
                          if (eventForm.document) {
                            formData.append('document', eventForm.document);
                          }
                          
                          // Add the JSON data as a string in the 'data' field
                          formData.append('data', JSON.stringify(eventData));

                          const token = localStorage.getItem('raci_auth_token');
                          
                          // Create event with approval status
                          let response;
                          if (eventForm.document) {
                            response = await fetch(`${env.apiBaseUrl}/events`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`
                              },
                              body: formData
                            });
                          } else {
                            response = await fetch(`${env.apiBaseUrl}/events`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify(eventData)
                            });
                          }

                          const responseText = await response.text();
                          let data;
                          try {
                            data = JSON.parse(responseText);
                          } catch (e) {
                            throw new Error('Invalid JSON response from server');
                          }

                          if (!response.ok) {
                            throw new Error(data.message || `Failed to create event: ${response.status}`);
                          }

                          console.log('Event created successfully:', data);
                          
                          // Now submit for approval using the event service
                          const createdEventId = data.id;
                          const firstHodObj = departmentHODs.find(h => String(h.id) === String(selectedHODs[0]));
                          if (!firstHodObj || !firstHodObj.email) {
                            throw new Error('Selected HOD email not found');
                          }
                          
                          await eventService.submitEventForApproval(createdEventId, firstHodObj.email);
                          console.log('Event sent for approval successfully');
                          
                          setSuccess('Event created and sent for approval successfully! You can view it in the Event List page.');

                          // Reset form
                          setEventForm({
                            name: '',
                            description: '',
                            departmentId: '',
                            division: '',
                            priority: '',
                            eventType: '',
                            kpi: '', // Add KPI field to reset
                            document: null,
                            hod: ''
                          });
                          setSelectedEmployees([]);
                          setEventSubtasks([]);
                          setSelectedHODs([]);
                          
                          // Reset file input
                          const fileInput = document.getElementById('document');
                          if (fileInput) fileInput.value = '';

                          // Refresh events list to show the new event
                          await fetchEvents();
                          
                        } catch (err) {
                          console.error('Error creating event and sending for approval:', err);
                          setError('Failed to create event and send for approval. Please try again.');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      style={{ 
                        padding: '0.75rem 1.5rem', 
                        background: submitting ? '#94a3b8' : '#16a34a', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: submitting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {submitting ? 'Creating and Sending for Approval...' : 'Create Event and Send for Approval to HOD'}
                    </button>
                  )}
                </div>
              </form>
            </div>
            
            {/* Events List moved to separate Event List page */}
            {false && (
              <div className="card fix-card">
                <div className="card-header" style={{ 
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h2>Events List</h2>
                  <button 
                    onClick={fetchEvents}
                    style={{
                      padding: '0.5rem',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title="Refresh Events"
                  >
                    🔄
                  </button>
                </div>
                
                {loadingEvents ? (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    padding: '2rem',
                    color: '#6b7280'
                  }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.75rem' }}></div>
                    Loading events...
                  </div>
                ) : (
                  events.length > 0 ? (
                    <div className="events-table-container" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Event Name</th>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Department</th>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Status</th>
                            <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Created On</th>
                            <th style={{ textAlign: 'right', padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map(event => (
                            <tr key={event.id}>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{event.name}</td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                {event.department ? event.department.name : 'N/A'}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  backgroundColor: 
                                    event.status === 'approved' ? '#dcfce7' :
                                    event.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                                  color: 
                                    event.status === 'approved' ? '#15803d' :
                                    event.status === 'rejected' ? '#b91c1c' : '#4b5563'
                                }}>
                                  {event.status?.charAt(0).toUpperCase() + event.status?.slice(1) || 'Pending'}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                {new Date(event.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button 
                                    onClick={() => navigate(`/company-admin/events/${event.id}`)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="View Event Details"
                                  >
                                    👁️
                                  </button>
                                  <button 
                                    onClick={() => navigate(`/company-admin/events/edit/${event.id}`)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Edit Event"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => openSubtaskForm(event)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Add Subtask"
                                  >
                                    ➕
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteEvent(event.id)}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#fee2e2',
                                      border: '1px solid #fecaca',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      color: '#b91c1c'
                                    }}
                                    title="Delete Event"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '2rem', 
                      textAlign: 'center',
                      color: '#6b7280',
                      border: '1px dashed #d1d5db',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
                      <p style={{ marginBottom: '1rem' }}>No events have been created yet.</p>
                      <p>Create your first event using the form above.</p>
                    </div>
                  )
                )}
              </div>
            )}
            
            {renderSubtaskForm()}
          </div>
        </main>
      </div>
  );
};

export default EventMaster;