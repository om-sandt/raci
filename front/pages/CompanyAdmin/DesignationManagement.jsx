import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../src/services/api';
import authService from '../../src/services/auth.service';
import env from '../../src/config/env';

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

const DesignationManagement = () => {
  const navigate = useNavigate();
  
  // State for designations data
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [editForm, setEditForm] = useState({
    name: ''
  });
  const [saving, setSaving] = useState(false);
  
  // State for company data
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  
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
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/designations');
      setDesignations(response.data || []);
    } catch (err) {
      setError('Failed to load designations');
      console.error('Error fetching designations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (designation) => {
    setEditingDesignation(designation);
    setEditForm({ name: designation.name });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleEditInputChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await apiService.put(`/designations/${editingDesignation.id}`, editForm);
      setSuccess('Designation updated successfully!');
      setShowEditModal(false);
      setEditingDesignation(null);
      setEditForm({ name: '' });
      fetchDesignations();
    } catch (err) {
      setError(err.message || 'Failed to update designation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (designation) => {
    if (window.confirm(`Are you sure you want to delete the designation "${designation.name}"? This action cannot be undone.`)) {
      try {
        setError('');
        setSuccess('');
        await apiService.delete(`/designations/${designation.id}`);
        setSuccess('Designation deleted successfully!');
        fetchDesignations();
      } catch (err) {
        setError(err.message || 'Failed to delete designation');
      }
    }
  };

  const handleRefresh = () => {
    fetchDesignations();
  };

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
              console.log("Logo failed to load, using fallback");
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
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/company-admin/dashboard');
  };

  return (
    <div>
      {/* Top Navbar/Header */}
      <header className="dashboard-header-new" style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="company-info" style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={handleBackToDashboard}
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
                {companyData ? `${companyData.name} Administration` : 'Administration'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                Designation Directory
              </p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="user-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1rem', overflow: 'hidden' }}>
              {renderUserPhoto()}
            </div>
            <div className="user-details" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="user-name" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{currentUser ? currentUser.name : 'Loading...'}</div>
              <div className="user-role" style={{ fontSize: '0.8rem', color: '#6b7280' }}>{currentUser ? currentUser.role : 'Loading...'}</div>
            </div>
            <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s ease' }}>Logout</button>
          </div>
        </div>
      </header>
      <div style={{ padding: '2rem', margin: '0 2rem' }}>
        <div className="page-header">
          <h1>Designation Directory</h1>
          <p>Manage company designations and job positions</p>
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
        
        {/* Designations Table */}
        <div className="card" style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <div className="card-header" style={{ 
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2>All Designations</h2>
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
              <button 
                onClick={() => navigate('/company-admin/designation-creation')}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                + Add New
              </button>
            </div>
          </div>
          
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '2rem',
              color: '#6b7280'
            }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginRight: '0.75rem' }}></div>
              Loading designations...
            </div>
          ) : designations.length === 0 ? (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center',
              color: '#6b7280',
              border: '1px dashed #d1d5db',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏷️</div>
              <p style={{ marginBottom: '1rem' }}>No designations found.</p>
              <p>Create your first designation to get started.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.95rem'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', verticalAlign: 'middle' }}>Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', verticalAlign: 'middle' }}>Created At</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', verticalAlign: 'middle' }}>Updated At</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'middle' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {designations.map(designation => (
                    <tr key={designation.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>{designation.name}</td>
                      <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                        {designation.createdAt ? new Date(designation.createdAt).toLocaleString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                        {designation.updatedAt && designation.createdAt !== designation.updatedAt 
                          ? new Date(designation.updatedAt).toLocaleString() 
                          : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleEdit(designation)}
                            style={{ 
                              padding: '0.5rem 0.75rem', 
                              background: '#4f46e5', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(designation)}
                            style={{ 
                              padding: '0.5rem 0.75rem', 
                              background: '#ef4444', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Edit Modal */}
        {showEditModal && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              width: '90%',
              maxWidth: '500px',
              padding: '0',
              position: 'relative',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div className="modal-header" style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Designation</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
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
              
              <div style={{ padding: '1.5rem' }}>
                <form onSubmit={handleSaveEdit}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="name" style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontWeight: '500', 
                      color: '#374151' 
                    }}>
                      Designation Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditInputChange}
                      required
                      placeholder="Enter designation name"
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
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    marginTop: '1.5rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !editForm.name.trim()}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: saving ? '#94a3b8' : '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignationManagement; 