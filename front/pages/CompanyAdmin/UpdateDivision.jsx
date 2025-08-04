import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import divisionService from '../../src/services/division.service';

const UpdateDivision = () => {
  const [divisions, setDivisions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await divisionService.getDivisions();
      setDivisions(res.data || []);
    } catch (err) {
      setError('Failed to load divisions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    const division = divisions.find(d => String(d.id) === String(id));
    setName(division ? division.name : '');
    setSuccess('');
    setError('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedId) {
      setError('Please select a division');
      return;
    }
    if (!name.trim()) {
      setError('Division name is required');
      return;
    }
    setLoading(true);
    try {
      await divisionService.updateDivision(selectedId, { name: name.trim() });
      setSuccess('Division updated successfully!');
      fetchDivisions();
      // Close the modal after successful update
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingDivision(null);
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to update division');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this division? This action cannot be undone.')) {
      setDeleteLoading(true);
      setError('');
      setSuccess('');
      try {
        await divisionService.deleteDivision(id);
        setSuccess('Division deleted successfully!');
        fetchDivisions();
        if (selectedId === id) {
          setSelectedId('');
          setName('');
        }
      } catch (err) {
        setError(err.message || 'Failed to delete division');
      } finally {
        setDeleteLoading(false);
      }
    }
  };
  
  const handleEdit = (division) => {
    setEditingDivision(division);
    setName(division.name);
    setSelectedId(division.id);
    setSuccess('');
    setError('');
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDivision(null);
    setSelectedId('');
    setName('');
    setError('');
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header">
        <h1>Update Division</h1>
        <p>Modify an existing division in your company</p>
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
      
      {/* Division List */}
      <div className="card" style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <div className="card-header" style={{ 
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2>Division List</h2>
          {loading && <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Loading...</span>}
        </div>
        
        {divisions.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7280' }}>
            {loading ? 'Loading divisions...' : 'No divisions found. Create one to get started.'}
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
                {divisions.map(division => (
                  <tr key={division.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>{division.name}</td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                      {division.createdAt ? new Date(division.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                      {division.updatedAt && division.createdAt !== division.updatedAt 
                        ? new Date(division.updatedAt).toLocaleString() 
                        : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleEdit(division)}
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
                          onClick={() => handleDelete(division.id)}
                          disabled={deleteLoading}
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            background: '#ef4444', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: deleteLoading ? 'not-allowed' : 'pointer',
                            opacity: deleteLoading ? 0.7 : 1
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
      
      {/* Edit Division Modal */}
      {isModalOpen && (
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
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Division</h2>
              <button 
                onClick={closeModal}
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
              
              <form onSubmit={handleUpdate}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="name" style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: '500', 
                    color: '#374151' 
                  }}>
                    Division Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Enter division name"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Enter a clear division name that will be used in dropdown selections.
                  </p>
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
                    onClick={closeModal}
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
                    disabled={loading || !name.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: loading ? '#94a3b8' : '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Updating...' : 'Update Division'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateDivision;
