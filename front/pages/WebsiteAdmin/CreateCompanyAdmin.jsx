import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../src/services/api';
import env from '../../src/config/env';
import '../../styles/dashboard.scss';

const CreateCompanyAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Add this to access location state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [tempPassword, setTempPassword] = useState('');
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    designation: '',
    employeeId: '',
    companyId: '',
    role: 'company_admin'
  });

  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const response = await apiService.get(env.companiesUrl);
        console.log('Companies response:', response);
        
        // Handle different response formats
        if (response && response.companies) {
          setCompanies(response.companies);
        } else if (Array.isArray(response)) {
          setCompanies(response);
        } else {
          setCompanies([]);
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        setError('Failed to load companies. Please try again.');
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  // Set preselected company if provided in navigation state
  useEffect(() => {
    if (location.state?.preselectedCompanyId) {
      setFormData(prev => ({
        ...prev,
        companyId: location.state.preselectedCompanyId
      }));
    }
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (!formData.designation) {
      setError('Please enter designation');
      return false;
    }
    
    if (!formData.companyId) {
      setError('Please select a company');
      return false;
    }
    
    if (!photo) {
      setError('Please upload a profile photo for the company admin');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare multipart form data
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('role', 'company_admin');
      formDataToSend.append('designation', formData.designation);
      if (formData.phone) formDataToSend.append('phone', formData.phone);
      if (formData.employeeId) formDataToSend.append('employeeId', formData.employeeId);
      formDataToSend.append('companyId', formData.companyId);
      formDataToSend.append('photo', photo);

      // Get token and send fetch
      const token = localStorage.getItem(env.authTokenKey);
      const responseRaw = await fetch(`${env.apiBaseUrl}${env.usersUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const response = await responseRaw.json();
      
      console.log('Company admin creation successful:', response);
      
      // Extract temp password if returned by API
      if (response && response.tempPassword) {
        setTempPassword(response.tempPassword);
        setShowPasswordInfo(true);
      }
      
      setSuccess('Company admin created successfully!');
      
      // Don't redirect immediately if we have a temp password to show
      if (!response || !response.tempPassword) {
        setTimeout(() => {
          navigate('/website-admin/dashboard', { state: { refreshData: true } });
        }, 1500);
      }
      
    } catch (err) {
      console.error('Error creating company admin:', err);
      setError(err.message || 'Failed to create company admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <h1>Create Company Admin</h1>
      </div>
      
      {/* Temporary Password Information */}
      {showPasswordInfo && (
        <div className="temp-password-info" style={{
          padding: '1.5rem',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ 
              fontSize: '1.5rem', 
              marginRight: '1rem',
              color: '#0284c7'
            }}>🔑</span>
            <h2 style={{ margin: 0, fontWeight: '600', color: '#0284c7' }}>
              Temporary Password Created
            </h2>
          </div>
          
          <p style={{ marginBottom: '1rem', color: '#0369a1' }}>
            A temporary password has been generated for this user. Please share it securely with them:
          </p>
          
          <div style={{
            background: 'rgba(2, 132, 199, 0.1)',
            padding: '0.75rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontWeight: '600',
            fontSize: '1.25rem',
            letterSpacing: '0.05em',
            color: '#0369a1',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            {tempPassword}
          </div>
          
          <p style={{ color: '#0369a1', fontWeight: '500' }}>
            Important: The user will be prompted to change this password upon first login.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              onClick={() => navigate('/website-admin/dashboard', { state: { refreshData: true } })}
              style={{
                padding: '0.75rem 1.25rem',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
      
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
          <h2>Create New Company Administrator</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter full name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="employeeId">Employee ID</label>
            <input
              type="text"
              id="employeeId"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              placeholder="Enter employee ID"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="designation">Designation *</label>
            <input
              type="text"
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
              placeholder="e.g. Operations Manager"
              required
            />
          </div>
          
          <div className="form-group full-width">
            <label htmlFor="companyId">Company *</label>
            <select
              id="companyId"
              name="companyId"
              value={formData.companyId}
              onChange={handleInputChange}
              required
              disabled={loadingCompanies}
            >
              <option value="">
                {loadingCompanies ? 'Loading companies...' : 'Select Company'}
              </option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {loadingCompanies && <div className="field-hint">Loading companies...</div>}
            {!loadingCompanies && companies.length === 0 && (
              <div className="field-hint">No companies found. Please create a company first.</div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="photo">Profile Photo</label>
            <input
              type="file"
              id="photo"
              name="photo"
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </div>
          
          <div className="form-actions full-width" style={{ 
            marginTop: '1.5rem', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '1.25rem'
          }}>
            <button 
              type="button" 
              onClick={() => navigate('/website-admin/company-admins')}
              style={{ 
                padding: '0.75rem 1.25rem', 
                background: '#f3f4f6', 
                border: '1px solid #d1d5db', 
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || loadingCompanies}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: '#4f46e5', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Company Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCompanyAdmin;
