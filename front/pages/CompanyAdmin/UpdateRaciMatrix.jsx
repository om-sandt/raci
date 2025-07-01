import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/raci-matrix.scss';
import env from '../../src/config/env';

const UpdateRaciMatrix = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [raciData, setRaciData] = useState({});
  const [financialLimits, setFinancialLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Selection state for tracking user assignments to roles
  const [selections, setSelections] = useState({});
  
  useEffect(() => {
    const fetchEventAndRaciData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('raci_auth_token');
        
        // Fetch event details
        const eventResponse = await axios.get(`${env.apiBaseUrl}/events/${eventId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Fetch RACI matrix for this event
        const raciResponse = await axios.get(`${env.apiBaseUrl}/events/${eventId}/raci-matrix`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Fetch employees for assignment options
        const employeesResponse = await axios.get(`${env.apiBaseUrl}/companies/my-company/employees`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Set event data
        setEvent(eventResponse.data);
        
        // Set tasks from event
        const eventTasks = eventResponse.data.tasks || [];
        setTasks(eventTasks);
        
        // Set employees
        setEmployees(employeesResponse.data || []);
        
        // Process RACI data
        const raciMatrix = raciResponse.data;
        setRaciData(raciMatrix);
        
        // Initialize selections from existing RACI data
        const initialSelections = {};
        const initialFinancialLimits = {};
        
        // Process each task to set up selections and financial limits
        eventTasks.forEach(task => {
          initialSelections[task.id] = {
            responsible: [],
            accountable: [],
            consulted: [],
            informed: []
          };
          
          // Process responsible users and their financial limits
          if (raciMatrix.raci && raciMatrix.raci.responsible) {
            raciMatrix.raci.responsible.forEach(user => {
              if (user.taskAssignment && user.taskAssignment.taskId === task.id) {
                initialSelections[task.id].responsible.push(user.id);
                
                // Set financial limits if they exist
                if (user.financialLimits) {
                  const key = `task-${task.id}-responsible-${user.id}`;
                  initialFinancialLimits[key] = {
                    min: user.financialLimits.min,
                    max: user.financialLimits.max
                  };
                }
              }
            });
          }
          
          // Process accountable users and their financial limits
          if (raciMatrix.raci && raciMatrix.raci.accountable) {
            raciMatrix.raci.accountable.forEach(user => {
              if (user.taskAssignment && user.taskAssignment.taskId === task.id) {
                initialSelections[task.id].accountable.push(user.id);
                
                // Set financial limits if they exist
                if (user.financialLimits) {
                  const key = `task-${task.id}-accountable-${user.id}`;
                  initialFinancialLimits[key] = {
                    min: user.financialLimits.min,
                    max: user.financialLimits.max
                  };
                }
              }
            });
          }
          
          // Process consulted users
          if (raciMatrix.raci && raciMatrix.raci.consulted) {
            raciMatrix.raci.consulted.forEach(user => {
              if (user.taskAssignment && user.taskAssignment.taskId === task.id) {
                initialSelections[task.id].consulted.push(user.id);
              }
            });
          }
          
          // Process informed users
          if (raciMatrix.raci && raciMatrix.raci.informed) {
            raciMatrix.raci.informed.forEach(user => {
              if (user.taskAssignment && user.taskAssignment.taskId === task.id) {
                initialSelections[task.id].informed.push(user.id);
              }
            });
          }
        });
        
        setSelections(initialSelections);
        setFinancialLimits(initialFinancialLimits);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.response?.data?.message || error.message || "Failed to load RACI matrix data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventAndRaciData();
  }, [eventId]);
  
  // Toggle user selection for a specific task and role
  const toggleUserSelection = (taskId, userId, role) => {
    setSelections(prevSelections => {
      // Ensure the task exists in selections
      if (!prevSelections[taskId]) {
        prevSelections[taskId] = {
          responsible: [],
          accountable: [],
          consulted: [],
          informed: []
        };
      }
      
      // Get the current selections for this task and role
      const currentSelections = [...(prevSelections[taskId][role] || [])];
      
      // Toggle the user's selection
      const index = currentSelections.indexOf(userId);
      if (index === -1) {
        currentSelections.push(userId);
      } else {
        currentSelections.splice(index, 1);
      }
      
      // Return the updated selections
      return {
        ...prevSelections,
        [taskId]: {
          ...prevSelections[taskId],
          [role]: currentSelections
        }
      };
    });
  };
  
  // Check if a user is selected for a specific task and role
  const isUserSelected = (taskId, userId, role) => {
    return selections[taskId] && 
           selections[taskId][role] && 
           selections[taskId][role].includes(userId);
  };
  
  // Get all users selected for a specific task and role
  const getSelectedUsers = (taskId, role) => {
    return selections[taskId] && selections[taskId][role] ? selections[taskId][role] : [];
  };
  
  // Handle changes to financial limits
  const handleFinancialLimitChange = (taskId, userId, role, field, value) => {
    const key = `task-${taskId}-${role.toLowerCase()}-${userId}`;
    
    setFinancialLimits(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value !== "" ? parseFloat(value) : null
      }
    }));
  };
  
  // Format the RACI data for submission to the API
  const formatRaciDataForSubmission = () => {
    const taskAssignments = tasks.map(task => {
      // Get selected users for each RACI role
      const responsible = getSelectedUsers(task.id, "responsible");
      const accountable = getSelectedUsers(task.id, "accountable");
      const consulted = getSelectedUsers(task.id, "consulted");
      const informed = getSelectedUsers(task.id, "informed");
      
      // Create financial limits object according to the API spec
      const financialLimitsObj = {};
      
      // Process financial limits for Responsible users
      responsible.forEach(userId => {
        const key = `task-${task.id}-responsible-${userId}`;
        const limits = financialLimits[key];
        
        if (limits && (limits.min !== null || limits.max !== null)) {
          financialLimitsObj[key] = {
            min: limits.min !== null ? parseFloat(limits.min) : null,
            max: limits.max !== null ? parseFloat(limits.max) : null
          };
        }
      });
      
      // Process financial limits for Accountable users
      accountable.forEach(userId => {
        const key = `task-${task.id}-accountable-${userId}`;
        const limits = financialLimits[key];
        
        if (limits && (limits.min !== null || limits.max !== null)) {
          financialLimitsObj[key] = {
            min: limits.min !== null ? parseFloat(limits.min) : null,
            max: limits.max !== null ? parseFloat(limits.max) : null
          };
        }
      });
      
      return {
        taskId: task.id,
        responsible,
        accountable,
        consulted,
        informed,
        financialLimits: financialLimitsObj
      };
    });
    
    return {
      eventId: parseInt(eventId),
      taskAssignments
    };
  };
  
  // Submit the updated RACI matrix
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Format data according to API spec
      const raciData = formatRaciDataForSubmission();
      console.log("Updating RACI matrix:", JSON.stringify(raciData, null, 2));
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await axios.put(
        `${env.apiBaseUrl}/raci-matrices/${eventId}`, 
        raciData, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        alert('RACI matrix updated successfully!');
        navigate(`/company-admin/events/${eventId}`);
      } else {
        throw new Error(response.data.message || "Failed to update RACI matrix");
      }
    } catch (error) {
      console.error("Error updating RACI matrix:", error);
      setError(error.response?.data?.message || error.message || "Failed to update RACI matrix");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading RACI matrix data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(`/company-admin/events/${eventId}`)}>
          Back to Event
        </button>
      </div>
    );
  }
  
  return (
    <div className="update-raci-container">
      <div className="page-header">
        <h1>Update RACI Matrix</h1>
        <p>{event?.name || 'Event'}</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        {tasks.map(task => (
          <div key={task.id} className="raci-task-card">
            <h3>{task.name}</h3>
            <p>{task.description}</p>
            
            {/* RACI role assignment section */}
            <div className="raci-roles-container">
              {/* Responsible Role */}
              <div className="raci-role">
                <h4>Responsible (R)</h4>
                {employees.map(employee => (
                  <div key={`r-${task.id}-${employee.id}`} className="employee-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={isUserSelected(task.id, employee.id, 'responsible')}
                        onChange={() => toggleUserSelection(task.id, employee.id, 'responsible')}
                      />
                      {employee.name}
                    </label>
                    
                    {/* Financial limits input fields for Responsible */}
                    {isUserSelected(task.id, employee.id, 'responsible') && (
                      <div className="financial-limits">
                        <div className="limit-input">
                          <label>Min ($):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              financialLimits[`task-${task.id}-responsible-${employee.id}`]?.min ?? ""
                            }
                            onChange={(e) => 
                              handleFinancialLimitChange(
                                task.id, 
                                employee.id, 
                                'responsible', 
                                'min', 
                                e.target.value
                              )
                            }
                            placeholder="Min amount"
                          />
                        </div>
                        <div className="limit-input">
                          <label>Max ($):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              financialLimits[`task-${task.id}-responsible-${employee.id}`]?.max ?? ""
                            }
                            onChange={(e) => 
                              handleFinancialLimitChange(
                                task.id, 
                                employee.id, 
                                'responsible', 
                                'max', 
                                e.target.value
                              )
                            }
                            placeholder="Max amount"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Accountable Role */}
              <div className="raci-role">
                <h4>Accountable (A)</h4>
                {employees.map(employee => (
                  <div key={`a-${task.id}-${employee.id}`} className="employee-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={isUserSelected(task.id, employee.id, 'accountable')}
                        onChange={() => toggleUserSelection(task.id, employee.id, 'accountable')}
                      />
                      {employee.name}
                    </label>
                    
                    {/* Financial limits input fields for Accountable */}
                    {isUserSelected(task.id, employee.id, 'accountable') && (
                      <div className="financial-limits">
                        <div className="limit-input">
                          <label>Min ($):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              financialLimits[`task-${task.id}-accountable-${employee.id}`]?.min ?? ""
                            }
                            onChange={(e) => 
                              handleFinancialLimitChange(
                                task.id, 
                                employee.id, 
                                'accountable', 
                                'min', 
                                e.target.value
                              )
                            }
                            placeholder="Min amount"
                          />
                        </div>
                        <div className="limit-input">
                          <label>Max ($):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              financialLimits[`task-${task.id}-accountable-${employee.id}`]?.max ?? ""
                            }
                            onChange={(e) => 
                              handleFinancialLimitChange(
                                task.id, 
                                employee.id, 
                                'accountable', 
                                'max', 
                                e.target.value
                              )
                            }
                            placeholder="Max amount"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Consulted Role */}
              <div className="raci-role">
                <h4>Consulted (C)</h4>
                {employees.map(employee => (
                  <div key={`c-${task.id}-${employee.id}`} className="employee-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={isUserSelected(task.id, employee.id, 'consulted')}
                        onChange={() => toggleUserSelection(task.id, employee.id, 'consulted')}
                      />
                      {employee.name}
                    </label>
                  </div>
                ))}
              </div>
              
              {/* Informed Role */}
              <div className="raci-role">
                <h4>Informed (I)</h4>
                {employees.map(employee => (
                  <div key={`i-${task.id}-${employee.id}`} className="employee-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={isUserSelected(task.id, employee.id, 'informed')}
                        onChange={() => toggleUserSelection(task.id, employee.id, 'informed')}
                      />
                      {employee.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate(`/company-admin/events/${eventId}`)}
            disabled={saving}
          >
            Cancel
          </button>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Update RACI Matrix"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateRaciMatrix;
