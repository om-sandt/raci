import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../src/services/api';
import '../../styles/dashboard.scss';
import env from '../../src/config/env';

const EditCompany = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [originalLogo, setOriginalLogo] = useState('');
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  const [projectLogo, setProjectLogo] = useState(null);
  const [projectLogoPreview, setProjectLogoPreview] = useState('');
  const [originalProjectLogo, setOriginalProjectLogo] = useState('');

  // Load company data
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setLoading(true);
        const data = await apiService.get(`/companies/${id}`);
        console.log('Company data:', data);
        
        // Set form data from company
        setFormData({
          name: data.name || '',
          domain: data.domain || '',
          industry: data.industry || '',
          size: data.size || '',
          panId: data.panId || '',
          projectName: data.projectName || ''
        });
        
        // Set logo preview if exists
        if (data.logoUrl) {
          setOriginalLogo(`${env.apiBaseUrl}${data.logoUrl}`);
          setLogoPreview(`${env.apiBaseUrl}${data.logoUrl}`);
        }

        // Set project logo preview if exists
        if (data.projectLogo) {
          setOriginalProjectLogo(`${env.apiBaseUrl}${data.projectLogo}`);
          setProjectLogoPreview(`${env.apiBaseUrl}${data.projectLogo}`);
        }

        const industryValue = data.industry || '';
        setShowCustomIndustry(industryValue === "Other" || 
          (industryValue && !["Technology", "Finance", "Healthcare", 
            "Education", "Manufacturing", "Retail", "Other"].includes(industryValue)));
      } catch (err) {
        console.error('Failed to load company:', err);
        setError('Failed to load company data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCompany();
    }
  }, [id]);

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

  // Handle project logo change
  const handleProjectLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProjectLogo(file);
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
    setSaving(true);
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
      
      // Append optional new fields
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
      
      // Add project logo if provided
      if (projectLogo instanceof File) {
        formDataToSend.append('projectLogo', projectLogo);
      }
      
      // Get the authentication token
      const token = localStorage.getItem('raci_auth_token');
      
      // Send PUT request to update company
      const response = await fetch(`${env.apiBaseUrl}/companies/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update company' }));
        throw new Error(errorData.message || 'Failed to update company');
      }
      
      setSuccess('Company updated successfully!');
      
      // Navigate back to dashboard after short delay with refresh flag
      setTimeout(() => {
        navigate('/website-admin/dashboard', { 
          state: { refreshData: true } 
        });
      }, 1500);
    } catch (err) {
      console.error('Error updating company:', err);
      setError(err.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #4f46e5', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginLeft: '15px' }}>Loading company data...</p>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <h1>Edit Company</h1>
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
          <h2>Edit Company Information</h2>
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
              value={["Technology", "Finance", "Healthcare", "Education", 
                "Manufacturing", "Retail", ""].includes(formData.industry) ? 
                formData.industry : "Other"}
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
                value={["Technology", "Finance", "Healthcare", "Education", 
                  "Manufacturing", "Retail", "Other", ""].includes(formData.industry) ? 
                  "" : formData.industry}
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
            {originalLogo && !logoPreview && (
              <div className="logo-preview" style={{ marginTop: '15px', maxWidth: '200px' }}>
                <img src={originalLogo} alt="Current Logo" style={{ 
                  width: '100%', 
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  padding: '0.25rem'
                }} />
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>Current logo</p>
              </div>
            )}
          </div>
          
          {/* PAN ID Field */}
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

          {/* Project Name Field */}
          <div className="form-group">
            <label htmlFor="projectName" style={{ 
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500'
            }}>Project Name</label>
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
          
          {/* Project Logo Field */}
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
            {originalProjectLogo && !projectLogoPreview && (
              <div className="logo-preview" style={{ marginTop: '15px', maxWidth: '200px' }}>
                <img src={originalProjectLogo} alt="Current Project Logo" style={{ 
                  width: '100%', 
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  padding: '0.25rem'
                }} />
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>Current project logo</p>
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
              disabled={saving}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: '#4f46e5', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCompany;
