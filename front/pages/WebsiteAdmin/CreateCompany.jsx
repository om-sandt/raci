import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../src/services/api';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

const CreateCompany = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    industry: '',
    size: '',
    panId: '',
    projectName: ''
  });
  
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  
  // New state for project logo
  const [projectLogo, setProjectLogo] = useState(null);
  const [projectLogoPreview, setProjectLogoPreview] = useState('');
  
  // Add state for modal at the top
  const [showProjectNameHelp, setShowProjectNameHelp] = useState(false);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleProjectLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProjectLogo(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setProjectLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleIndustryChange = (e) => {
    const { value } = e.target;
    setFormData({
      ...formData,
      industry: value
    });
    
    // Show custom industry field if "Other" is selected
    setShowCustomIndustry(value === "Other");
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Create form data for multipart/form-data request
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('domain', formData.domain);
      
      if (formData.industry) {
        formDataToSend.append('industry', formData.industry);
      }
      
      if (formData.size) {
        formDataToSend.append('size', formData.size);
      }
      
      // Append new fields if provided
      if (formData.panId) {
        formDataToSend.append('panId', formData.panId);
      }
      if (formData.projectName) {
        formDataToSend.append('projectName', formData.projectName);
      }
      
      // Add logo if provided
      if (logo instanceof File) {
        formDataToSend.append('logo', logo);
      }
      
      // Add project logo if provided (send in both camelCase and snake_case for compatibility)
      if (projectLogo instanceof File) {
        formDataToSend.append('projectLogo', projectLogo);
        formDataToSend.append('project_logo', projectLogo);
      }
      
      // Get the authentication token
      const token = localStorage.getItem('raci_auth_token');
      
      // Send POST request to create company
      const response = await fetch(`${env.apiBaseUrl}/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create company' }));
        throw new Error(errorData.message || 'Failed to create company');
      }
      
      setSuccess('Company created successfully!');
      
      // Navigate back to dashboard after short delay with refresh flag
      setTimeout(() => {
        navigate('/website-admin/dashboard', { 
          state: { refreshData: true } 
        });
      }, 1500);
    } catch (err) {
      console.error('Error creating company:', err);
      setError(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <h1>Create New Company</h1>
      </div>
      
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
      
      <div className="card" style={{ 
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card-header" style={{ 
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h2>Company Information</h2>
        </div>
      
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label htmlFor="name" style={{ 
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500'
            }}>Company Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter company name"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="domain" style={{ 
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500'
            }}>Company Domain *</label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleInputChange}
              placeholder="example.com"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="industry">Industry</label>
            <select
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleIndustryChange}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">Select Industry</option>
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          {showCustomIndustry && (
            <div className="form-group">
              <label htmlFor="customIndustry">Specify Industry</label>
              <input
                type="text"
                id="customIndustry"
                name="industry"
                value={formData.industry === "Other" ? "" : formData.industry}
                onChange={handleInputChange}
                placeholder="Enter industry name"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="size">Company Size</label>
            <select
              id="size"
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">Select Size</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="501-1000">501-1000 employees</option>
              <option value="1001+">1001+ employees</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="panId" style={{ 
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500'
            }}>PAN ID (optional)</label>
            <input
              type="text"
              id="panId"
              name="panId"
              value={formData.panId}
              onChange={handleInputChange}
              placeholder="Enter PAN ID (optional)"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="projectName" style={{ 
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              Project Name
              <span
                style={{ cursor: 'pointer', fontSize: '1.1em', color: '#4f46e5' }}
                onClick={() => setShowProjectNameHelp(true)}
                title="Help on Project Name"
              >
                ℹ️
              </span>
            </label>
            <input
              type="text"
              id="projectName"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              placeholder="Enter Project Name"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div className="form-group full-width">
            <label htmlFor="logo">Company Logo</label>
            <input
              type="file"
              id="logo"
              name="logo"
              onChange={handleLogoChange}
              accept="image/*"
              style={{
                padding: '0.5rem 0',
                fontSize: '1rem'
              }}
            />
            {logoPreview && (
              <div className="logo-preview" style={{ marginTop: '15px', maxWidth: '200px' }}>
                <img src={logoPreview} alt="Logo Preview" style={{ 
                  width: '100%', 
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  padding: '0.25rem'
                }} />
              </div>
            )}
          </div>
          
          <div className="form-group full-width">
            <label htmlFor="projectLogo">Project Logo</label>
            <input
              type="file"
              id="projectLogo"
              name="projectLogo"
              onChange={handleProjectLogoChange}
              accept="image/*"
              style={{
                padding: '0.5rem 0',
                fontSize: '1rem'
              }}
            />
            {projectLogoPreview && (
              <div className="logo-preview" style={{ marginTop: '15px', maxWidth: '200px' }}>
                <img src={projectLogoPreview} alt="Project Logo Preview" style={{ 
                  width: '100%', 
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  padding: '0.25rem'
                }} />
              </div>
            )}
          </div>
          
          <div className="form-actions" style={{ 
            marginTop: '20px', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '1.25rem'
          }}>
            <button 
              type="button" 
              onClick={() => navigate('/website-admin/dashboard')}
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
              disabled={loading}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: '#4f46e5', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
        {/* Project Name Help Modal */}
        {showProjectNameHelp && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
            onClick={() => setShowProjectNameHelp(false)}
          >
            <div style={{
              background: 'white',
              borderRadius: '10px',
              padding: '2rem',
              maxWidth: '420px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
              position: 'relative',
              cursor: 'auto'
            }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowProjectNameHelp(false)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '14px',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.3em',
                  cursor: 'pointer',
                  color: '#888'
                }}
                aria-label="Close"
              >×</button>
              <h3 style={{ marginBottom: '1rem', color: '#4f46e5' }}>Help box on Project name</h3>
              <div style={{ fontSize: '1.05em', color: '#222', lineHeight: '1.7' }}>
                <div style={{ marginBottom: '0.7em' }}>
                  <b>Enter a clear and professional project name</b> that accurately reflects the initiative’s scope or objective.
                </div>
                <div style={{ marginBottom: '0.7em' }}>
                  This name will be used throughout the <b>RACI Matrix</b>, documentation, and stakeholder communications.
                </div>
                <div style={{ marginBottom: '0.5em' }}><b>For example:</b></div>
                <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
                  <li>Finance Transformation – Q3 2025</li>
                  <li>Customer Experience Enhancement Program</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateCompany;
