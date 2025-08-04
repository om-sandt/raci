import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import env from '../../src/config/env';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';

// Helper to build correct asset URLs
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

const DivisionManagement = () => {
  const navigate = useNavigate();
  
  // State for divisions data
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDivision, setEditingDivision] = useState(null);
  const [editForm, setEditForm] = useState({
    name: ''
  });
  const [saving, setSaving] = useState(false);
  
  // State for expanded sections in sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: false,
    designations: false,
    divisions: false, // Do not auto-expand Division section
    locations: false,
    raci: false
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // State for division section toggle
  const [divisionSectionExpanded, setDivisionSectionExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  
  // State for company data
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  
  // Toggle sidebar sections
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };
  
  // Load user and company data
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        
        if (userData && userData.company) {
          setLoadingCompany(true);
          const companyId = userData.company.id;
          
          try {
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const companyDetails = await response.json();
              const mappedDetails = {
                ...companyDetails,
                projectLogo: companyDetails.projectLogo || companyDetails.project_logo || '',
                projectName: companyDetails.projectName || companyDetails.project_name || ''
              };
              setCompanyData(mappedDetails);
            } else {
              setCompanyData({
                id: userData.company.id,
                name: userData.company.name || 'Your Company'
              });
            }
          } catch (error) {
            console.error('Failed to fetch company details:', error);
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
  
  // Fetch divisions
  const fetchDivisions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/divisions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error fetching divisions:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          endpoint: `${env.apiBaseUrl}/divisions`
        });
        throw new Error(`Failed to fetch divisions: ${response.status}`);
      }
      
      const data = await response.json();
      setDivisions(data.data || data || []);
      console.log('Divisions loaded successfully:', data);
      
    } catch (error) {
      console.error('Error fetching divisions:', error);
      setError('Failed to load divisions. Please try again.');
      setDivisions([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load divisions on component mount
  useEffect(() => {
    fetchDivisions();
  }, []);
  
  // Handle edit division
  const handleEdit = (division) => {
    setEditingDivision(division);
    setEditForm({
      name: division.name
    });
    setShowEditModal(true);
  };
  
  // Handle form input change
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle save edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      if (!editForm.name.trim()) {
        throw new Error('Division name is required');
      }
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/divisions/${editingDivision.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error updating division:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          endpoint: `${env.apiBaseUrl}/divisions/${editingDivision.id}`
        });
        throw new Error(`Failed to update division: ${response.status}`);
      }
      
      const updatedData = await response.json();
      console.log('Division updated successfully:', updatedData);
      
      setSuccess('Division updated successfully!');
      setShowEditModal(false);
      setEditingDivision(null);
      
      // Refresh the divisions list
      await fetchDivisions();
      
    } catch (error) {
      console.error('Error updating division:', error);
      setError(error.message || 'Failed to update division. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle delete division
  const handleDelete = async (division) => {
    if (window.confirm(`Are you sure you want to delete the division "${division.name}"? This action cannot be undone.`)) {
      try {
        setError('');
        
        const token = localStorage.getItem('raci_auth_token');
        const response = await fetch(`${env.apiBaseUrl}/divisions/${division.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error deleting division:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            endpoint: `${env.apiBaseUrl}/divisions/${division.id}`
          });
          throw new Error(`Failed to delete division: ${response.status}`);
        }
        
        setSuccess('Division deleted successfully!');
        
        // Refresh the divisions list
        await fetchDivisions();
        
      } catch (error) {
        console.error('Error deleting division:', error);
        setError(error.message || 'Failed to delete division. Please try again.');
      }
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    fetchDivisions();
  };
  
  // Handle create division button click
  const handleCreateDivision = () => {
    setDivisionSectionExpanded(true);
    setActiveTab('create');
  };

  // Handle create division form submit
  const handleCreateDivisionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData(e.target);
      const name = formData.get('name');
      
      if (!name.trim()) {
        throw new Error('Division name is required');
      }
      
      const token = localStorage.getItem('raci_auth_token');
      const response = await fetch(`${env.apiBaseUrl}/divisions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create division');
      }
      
      setSuccess('Division created successfully!');
      e.target.reset();
      
      // Switch to manage tab and refresh divisions
      setActiveTab('manage');
      await fetchDivisions();
      
    } catch (error) {
      console.error('Error creating division:', error);
      setError(error.message || 'Failed to create division. Please try again.');
    }
  };
  
  // Enhanced logo rendering methods
  const renderCompanyLogo = () => {
    if (!companyData) return null;
    
    const rawLogo = companyData.logoUrl || companyData.logo;
    if (rawLogo) {
      const logoUrl = rawLogo.startsWith('http')
        ? rawLogo
        : `${env.apiHost}${rawLogo}`;
      
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
  
  return (
    <div className="dashboard-layout">
      <aside className="sidebar" style={{ display: sidebarOpen ? 'block' : 'none' }}>
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

          <div className="nav-item" onClick={() => toggleSection('users')}>
            <i className="icon">👥</i> <span>User Administration</span>
            <i className={`dropdown-icon ${expandedSections.users ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.users ? 'open' : ''}`}> 
            <NavLink to="/company-admin/user-creation" className="nav-item">Create User</NavLink>
            <NavLink to="/company-admin/user-management" className="nav-item">Update User</NavLink>
          </div>

          <div 
            className={`nav-item${expandedSections.divisions ? ' active' : ''}`}
            onClick={() => toggleSection('divisions')}
          >
            <i className="icon">🏬</i> 
            <span>Division Management</span>
            <i className={`dropdown-icon ${expandedSections.divisions ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.divisions ? 'open' : ''}`}> 
            <NavLink to="/company-admin/create-division" className="nav-item">Create Division</NavLink>
            <NavLink to="/company-admin/update-division" className="nav-item">Update Division</NavLink>
          </div>

          <div className="nav-item" onClick={() => toggleSection('departments')}>
            <i className="icon">🏢</i> <span>Department Workspace</span>
            <i className={`dropdown-icon ${expandedSections.departments ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.departments ? 'open' : ''}`}> 
            <NavLink to="/company-admin/department-creation" className="nav-item">Create Department</NavLink>
            <NavLink to="/company-admin/department-management" className="nav-item">Manage Departments</NavLink>
          </div>

          <div className="nav-item" onClick={() => toggleSection('designations')}>
            <i className="icon">🏷️</i> <span>Designation Directory</span>
            <i className={`dropdown-icon ${expandedSections.designations ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.designations ? 'open' : ''}`}>
            <NavLink to="/company-admin/designation-creation" className="nav-item">Create Designation</NavLink>
            <NavLink to="/company-admin/designation-management" className="nav-item">Update Designation</NavLink>
          </div>

          <div className="nav-item" onClick={() => toggleSection('locations')}>
            <i className="icon">📍</i> <span>Location Center</span>
            <i className={`dropdown-icon ${expandedSections.locations ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.locations ? 'open' : ''}`}>
            <NavLink to="/company-admin/location-creation" className="nav-item">Create Location</NavLink>
            <NavLink to="/company-admin/location-management" className="nav-item">Update Location</NavLink>
          </div>

          <div className="nav-item" onClick={() => toggleSection('raci')}>
            <i className="icon">📅</i> <span>RACI Operations</span>
            <i className={`dropdown-icon ${expandedSections.raci ? 'open' : ''}`}>▼</i>
          </div>
          <div className={`sub-nav ${expandedSections.raci ? 'open' : ''}`}>
            <NavLink to="/company-admin/event-master" className="nav-item">Event Master</NavLink>
            <NavLink to="/company-admin/event-list" className="nav-item">Event List</NavLink>
            <NavLink to="/company-admin/raci-assignment" className="nav-item">RACI Assignment</NavLink>
            <NavLink to="/company-admin/raci-tracker" className="nav-item">RACI Tracker</NavLink>
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

      {/* Collapse toggle button */}
      <button onClick={toggleSidebar} style={{
        position: 'fixed',
        top: '12px',
        left: sidebarOpen ? '312px' : '12px',
        zIndex: 100,
        background: '#4f46e5',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 8px',
        cursor: 'pointer'
      }}>
        {sidebarOpen ? '⮜' : '⮞'}
      </button>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-left">
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
                marginRight: '1rem'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              ←
            </button>
            <div className="dashboard-title">
              {companyData ? `${companyData.name} Administration` : 'Administration'}
            </div>
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
          </div>
        </header>
        
        <div className="content-wrapper">
          <div className="page-header">
            <h1>Division Directory</h1>
            <p>Manage company divisions and organizational units</p>
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
          
          {/* Division Directory Toggle Section */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div 
              className="nav-item active"
              onClick={() => setDivisionSectionExpanded(prev => !prev)}
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                fontWeight: 600, 
                fontSize: '1.1rem', 
                padding: '0.75rem 1rem', 
                borderBottom: divisionSectionExpanded ? '1px solid #e5e7eb' : 'none' 
              }}
            >
              <i className="icon">🏬</i> 
              <span style={{ marginLeft: 8 }}>Division Directory</span>
              <i 
                className={`dropdown-icon ${divisionSectionExpanded ? 'open' : ''}`} 
                style={{ 
                  marginLeft: 'auto',
                  transform: divisionSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              >
                ▼
              </i>
            </div>
            
            {divisionSectionExpanded && (
              <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb' }}>
                <button
                  onClick={() => setActiveTab('create')}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '12px 24px',
                    fontWeight: activeTab === 'create' ? 'bold' : 'normal',
                    borderBottom: activeTab === 'create' ? '3px solid #4f46e5' : '3px solid transparent',
                    color: activeTab === 'create' ? '#4f46e5' : '#222',
                    cursor: 'pointer',
                    outline: 'none',
                    fontSize: '1rem',
                    transition: 'color 0.2s, border-bottom 0.2s'
                  }}
                >
                  Create Division
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '12px 24px',
                    fontWeight: activeTab === 'manage' ? 'bold' : 'normal',
                    borderBottom: activeTab === 'manage' ? '3px solid #4f46e5' : '3px solid transparent',
                    color: activeTab === 'manage' ? '#4f46e5' : '#222',
                    cursor: 'pointer',
                    outline: 'none',
                    fontSize: '1rem',
                    transition: 'color 0.2s, border-bottom 0.2s'
                  }}
                >
                  Manage Divisions
                </button>
              </div>
            )}
            
            {divisionSectionExpanded && activeTab === 'create' && (
              <div style={{ padding: '1.5rem' }}>
                <form onSubmit={handleCreateDivisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Division Name *
                    </label>
                    <input 
                      type="text" 
                      name="name" 
                      required 
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter division name"
                    />
                  </div>
                  <button type="submit" style={{
                    padding: '0.5rem 1rem',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    marginTop: '0.5rem',
                    width: 'fit-content'
                  }}>Create Division</button>
                </form>
              </div>
            )}
            
            {divisionSectionExpanded && activeTab === 'manage' && (
              <div style={{ padding: '1.5rem' }}>
                {/* Divisions Table */}
                <div className="card-header" style={{ 
                  paddingBottom: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h2>All Divisions</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  onClick={handleRefresh}
                  style={{
                    padding: '0.5rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Refresh List"
                >
                  🔄
                </button>
              </div>
            </div>
            
            {loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '3rem',
                color: '#6b7280'
              }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  border: '2px solid #e5e7eb', 
                  borderTopColor: '#6366f1', 
                  animation: 'spin 1s linear infinite', 
                  marginRight: '0.75rem' 
                }}></div>
                Loading divisions...
              </div>
            ) : divisions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #e5e7eb', 
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        Division Name
                      </th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #e5e7eb', 
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        Created Date
                      </th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #e5e7eb', 
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        Last Modified
                      </th>
                      <th style={{ 
                        textAlign: 'right', 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #e5e7eb', 
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisions.map((division) => (
                      <tr key={division.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ 
                          padding: '1rem', 
                          borderBottom: '1px solid #e5e7eb',
                          fontWeight: '500',
                          color: '#111827'
                        }}>
                          {division.name}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          borderBottom: '1px solid #e5e7eb',
                          color: '#6b7280'
                        }}>
                          {division.createdAt ? new Date(division.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          borderBottom: '1px solid #e5e7eb',
                          color: '#6b7280'
                        }}>
                          {division.updatedAt ? new Date(division.updatedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'right'
                        }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => handleEdit(division)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: '#374151'
                              }}
                              title="Edit Division"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(division)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: '#b91c1c'
                              }}
                              title="Delete Division"
                            >
                              🗑️ Delete
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
                padding: '3rem', 
                textAlign: 'center',
                color: '#6b7280',
                border: '1px dashed #d1d5db',
                borderRadius: '8px',
                margin: '1rem'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏬</div>
                <p style={{ marginBottom: '1rem', fontWeight: '500' }}>No divisions found</p>
                <p style={{ marginBottom: '1.5rem' }}>Create your first division to get started.</p>
                <button 
                  onClick={handleCreateDivision}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Create Division
                </button>
              </div>
            )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '500px',
            margin: '1rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                Edit Division
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDivision(null);
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500' 
                }}>
                  Division Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '0.75rem',
                marginTop: '1.5rem'
              }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDivision(null);
                    setError('');
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.75rem 1rem',
                    background: saving ? '#94a3b8' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DivisionManagement;