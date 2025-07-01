import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import websiteAdminService from '../../src/services/website-admin.service';
import '../../styles/dashboard.scss';

const EditAdmin = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Fetch admin data on component mount
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!id) {
        setError('No admin ID provided');
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);
        const response = await websiteAdminService.getWebsiteAdminById(id);
        console.log('Admin data response:', response);
        
        if (response) {
          setFormData({
            fullName: response.full_name || response.fullName || '',
            email: response.email || '',
            phone: response.phone || ''
          });
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin data. Please try again.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchAdminData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  const validateForm = () => {
    if (!formData.fullName || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Password validation if password section is shown and fields are filled
    if (showPasswordSection && (passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword)) {
      if (!passwordData.currentPassword) {
        setError('Current password is required to change password');
        return false;
      }
      
      if (!passwordData.newPassword) {
        setError('New password is required');
        return false;
      }
      
      if (passwordData.newPassword.length < 8) {
        setError('New password must be at least 8 characters long');
        return false;
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
        return false;
      }
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
      const updateData = {
        fullName: formData.fullName,
        phone: formData.phone
        // Note: Email updates might be restricted by backend
      };

      // Add password data if password section is being used
      if (showPasswordSection && passwordData.currentPassword && passwordData.newPassword) {
        updateData.currentPassword = passwordData.currentPassword;
        updateData.newPassword = passwordData.newPassword;
      }

      console.log('Updating admin with data:', updateData);
      
      const response = await websiteAdminService.updateWebsiteAdmin(id, updateData);
      
      console.log('Website admin update successful:', response);
      
      if (showPasswordSection && passwordData.newPassword) {
        setSuccess('Website admin and password updated successfully!');
      } else {
        setSuccess('Website admin updated successfully!');
      }
      
      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
      
      // Redirect after success
      setTimeout(() => {
        navigate('/website-admin/dashboard', { state: { refreshData: true } });
      }, 1500);
      
    } catch (err) {
      console.error('Error updating website admin:', err);
      setError(err.message || 'Failed to update website admin');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="content-wrapper">
        <div className="loading-spinner" style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', borderRadius: '50%', border: '3px solid #f3f3f3', borderTop: '3px solid #667eea', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '1rem', color: '#667eea' }}>Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <h1>Edit Website Admin</h1>
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
          <h2>Update Website Administrator Details</h2>
          <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0' }}>
            Update the website administrator information. Email cannot be changed.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label htmlFor="fullName">Full Name *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter full name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              disabled
              style={{ 
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                cursor: 'not-allowed'
              }}
              title="Email cannot be changed"
            />
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Email cannot be changed for security reasons
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              required
            />
          </div>
          
          {/* Password Section */}
          <div className="form-group full-width" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Password Settings</h3>
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                style={{
                  padding: '0.5rem 1rem',
                  background: showPasswordSection ? '#fee2e2' : '#dcfce7',
                  color: showPasswordSection ? '#b91c1c' : '#15803d',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {showPasswordSection ? 'Cancel Password Change' : 'Change Password'}
              </button>
            </div>
            
            {showPasswordSection && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#f9fafb', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password *</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="newPassword">New Password *</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password (min 8 characters)"
                      minLength="8"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password *</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Password must be at least 8 characters long. Leave blank to keep current password.
                </div>
              </div>
            )}
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
              onClick={() => navigate('/website-admin/dashboard')}
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
              disabled={loading}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Updating...' : 'Update Website Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAdmin;