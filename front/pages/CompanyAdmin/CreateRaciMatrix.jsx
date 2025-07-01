import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import env from '../../src/config/env';

const CreateRaciMatrix = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  
  const [event, setEvent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Add state for financial limits
  const [financialLimits, setFinancialLimits] = useState({});
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('raci_auth_token');
        const eventResponse = await axios.get(`${env.apiBaseUrl}/events/${eventId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const tasksResponse = await axios.get(`${env.apiBaseUrl}/tasks/event/${eventId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const employeesResponse = await axios.get(`${env.apiBaseUrl}/employees`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setEvent(eventResponse.data);
        setTasks(tasksResponse.data);
        setEmployees(employeesResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId]);
  
  // Function to handle changes to financial limits
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
  
  const getSelectedUsers = (taskId, role) => {
    // ...existing code to get selected users for a task and role...
  };
  
  const isUserSelected = (taskId, userId, role) => {
    // ...existing code to check if a user is selected for a task and role...
  };
  
  const toggleUserSelection = (taskId, userId, role) => {
    // ...existing code to toggle user selection for a task and role...
  };
  
  // Format the RACI data according to API documentation
  const formatRaciDataForSubmission = () => {
    const taskAssignments = tasks.map(task => {
      const taskId = task.id;
      
      // Get selected users for each RACI role
      const responsible = getSelectedUsers(taskId, "responsible");
      const accountable = getSelectedUsers(taskId, "accountable");
      const consulted = getSelectedUsers(taskId, "consulted");
      const informed = getSelectedUsers(taskId, "informed");
      
      // Create financial limits object according to API format
      const financialLimitsObj = {};
      
      // Add financial limits for responsible users
      responsible.forEach(userId => {
        const key = `task-${taskId}-responsible-${userId}`;
        if (financialLimits[key]) {
          financialLimitsObj[key] = {
            min: financialLimits[key].min !== undefined ? parseFloat(financialLimits[key].min) : null,
            max: financialLimits[key].max !== undefined ? parseFloat(financialLimits[key].max) : null
          };
        }
      });
      
      // Add financial limits for accountable users
      accountable.forEach(userId => {
        const key = `task-${taskId}-accountable-${userId}`;
        if (financialLimits[key]) {
          financialLimitsObj[key] = {
            min: financialLimits[key].min !== undefined ? parseFloat(financialLimits[key].min) : null,
            max: financialLimits[key].max !== undefined ? parseFloat(financialLimits[key].max) : null
          };
        }
      });
      
      return {
        taskId,
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

  // Submit the RACI matrix
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Format data according to API spec
      const raciData = formatRaciDataForSubmission();
      console.log("Submitting RACI data:", JSON.stringify(raciData, null, 2));
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await axios.post(
        `${env.apiBaseUrl}/raci-matrices`, 
        raciData, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        alert('RACI matrix created successfully!');
        navigate(`/company-admin/events/${eventId}`);
      } else {
        throw new Error(response.data.message || "Failed to create RACI matrix");
      }
    } catch (error) {
      console.error("Error creating RACI matrix:", error);
      setError(error.response?.data?.message || error.message || "Failed to create RACI matrix");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="create-raci-container">
      <h1>Create RACI Matrix</h1>
      {error && <div className="error-message">{error}</div>}
      
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
                            min="0"
                            step="0.01"
                            value={financialLimits[`task-${task.id}-responsible-${employee.id}`]?.min ?? ""}
                            onChange={(e) => handleFinancialLimitChange(
                              task.id, employee.id, 'responsible', 'min', e.target.value
                            )}
                            placeholder="Min amount"
                          />
                        </div>
                        <div className="limit-input">
                          <label>Max ($):</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={financialLimits[`task-${task.id}-responsible-${employee.id}`]?.max ?? ""}
                            onChange={(e) => handleFinancialLimitChange(
                              task.id, employee.id, 'responsible', 'max', e.target.value
                            )}
                            placeholder="Max amount"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Accountable Role - with financial limits */}
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
                            min="0"
                            step="0.01"
                            value={financialLimits[`task-${task.id}-accountable-${employee.id}`]?.min ?? ""}
                            onChange={(e) => handleFinancialLimitChange(
                              task.id, employee.id, 'accountable', 'min', e.target.value
                            )}
                            placeholder="Min amount"
                          />
                        </div>
                        <div className="limit-input">
                          <label>Max ($):</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={financialLimits[`task-${task.id}-accountable-${employee.id}`]?.max ?? ""}
                            onChange={(e) => handleFinancialLimitChange(
                              task.id, employee.id, 'accountable', 'max', e.target.value
                            )}
                            placeholder="Max amount"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Consulted Role - no financial limits needed */}
              {/* ...existing code... */}
              
              {/* Informed Role - no financial limits needed */}
              {/* ...existing code... */}
            </div>
          </div>
        ))}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate(`/company-admin/events/${eventId}`)}
          >
            Cancel
          </button>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save RACI Matrix"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRaciMatrix;