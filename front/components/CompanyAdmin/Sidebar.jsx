import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const [isDepOpen, setIsDepOpen] = useState(false);
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Company Admin Dashboard</h3>
      </div>
      <ul className="sidebar-menu">
        <li>
          <NavLink to="/company-admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            Dashboard
          </NavLink>
        </li>
        
        {/* Department Management Section with Dropdown */}
        <li className="menu-item">
          <div 
            className="menu-button" 
            onClick={() => setIsDepOpen(!isDepOpen)}
          >
            <span>Department Management</span>
            <span className={`arrow ${isDepOpen ? 'down' : 'right'}`}>▶</span>
          </div>
          
          {isDepOpen && (
            <ul className="submenu">
              <li>
                <NavLink 
                  to="/company-admin/departments" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  View Departments
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/company-admin/create-department" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  Create Department
                </NavLink>
              </li>
            </ul>
          )}
        </li>
        
        {/* Add other menu items as needed */}
      </ul>
    </div>
  );
};

export default Sidebar;
