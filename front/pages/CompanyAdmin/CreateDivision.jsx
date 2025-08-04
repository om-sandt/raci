import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import divisionService from '../../src/services/division.service';

const CreateDivision = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name.trim()) {
      setError('Division name is required');
      return;
    }
    setLoading(true);
    try {
      const res = await divisionService.createDivision({ name: name.trim() });
      setSuccess('Division created successfully!');
      setName('');
      setTimeout(() => {
        navigate('/company-admin/update-division');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to create division');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header">
        <h1>Create Division</h1>
        <p>Add a new division to your company</p>
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
      
      {/* Create Division Form */}
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
          marginBottom: '1.5rem'
        }}>
          <h2>Division Details</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Division Name *</label>
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
                setName('');
                setError('');
                setSuccess('');
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
              Reset
            </button>
            <button 
              type="submit" 
              disabled={loading}
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
              {loading ? 'Creating...' : 'Create Division'}
            </button>
          </div>
        </form>
      </div>

      <style jsx="true">{`
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-actions {
          grid-column: 1 / -1;
        }
      `}</style>
    </div>
  );
};

export default CreateDivision;
