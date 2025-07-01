import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import websiteAdminService from '../../src/services/website-admin.service';
import authService from '../../src/services/auth.service';
import '../../styles/dashboard.scss';

const CreateAdmin = () => {
  const navigate = useNavigate();
  
  // Permission state
  const [canCreate, setCanCreate] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionError, setPermissionError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Check permissions on component mount
  useEffect(() => {
    checkCreatePermission();
  }, []);

  const checkCreatePermission = async () => {
    try {
      setPermissionLoading(true);
      
      // Get current user data from login response
      const currentUser = await authService.getCurrentUser();
      console.log('=== PERMISSION CHECK DEBUG ===');
      console.log('Full currentUser object:', currentUser);
      console.log('currentUser.email:', currentUser?.email);
      console.log('currentUser.canCreateAdmins:', currentUser?.canCreateAdmins);
      console.log('typeof canCreateAdmins:', typeof currentUser?.canCreateAdmins);
      console.log('canCreateAdmins === true:', currentUser?.canCreateAdmins === true);
      console.log('canCreateAdmins === false:', currentUser?.canCreateAdmins === false);
      console.log('================================');
      
      // Use ONLY the canCreateAdmins field from login response as the source of truth
      if (currentUser?.canCreateAdmins === true) {
        console.log('✅ User has canCreateAdmins = true, granting access');
        setCanCreate(true);
      } else if (currentUser?.canCreateAdmins === false) {
        console.log('❌ User has canCreateAdmins = false, denying access');
        setCanCreate(false);
        setPermissionError('You are not authorized to create website admins. Contact omvataliya23@gmail.com for permission.');
      } else {
        console.log('⚠️ canCreateAdmins field not found or undefined, denying access');
        console.log('Current user object keys:', Object.keys(currentUser || {}));
        setCanCreate(false);
        setPermissionError('Permission information not available. Contact omvataliya23@gmail.com for permission.');
      }
      
    } catch (error) {
      console.error('Failed to check permissions:', error);
      setCanCreate(false);
      setPermissionError('Failed to load permission data. Please contact omvataliya23@gmail.com for permission.');
    } finally {
      setPermissionLoading(false);
    }
  };

  // If still checking permissions, show loading
  if (permissionLoading) {
    return (
      <div className="create-admin-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If no permission, show access denied
  if (!canCreate) {
    return (
      <div className="create-admin-container">
        <div className="access-denied-container">
          <div className="access-denied-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>You are not authorized to create website admins.</p>
          <p>Contact <strong>omvataliya23@gmail.com</strong> for permission.</p>
          {permissionError && (
            <div className="error-message">
              <p>{permissionError}</p>
            </div>
          )}
          <div className="access-denied-actions">
            <button 
              type="button" 
              onClick={() => navigate('/website-admin/dashboard')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
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
      const adminData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password
      };
      
      const response = await websiteAdminService.createWebsiteAdmin(adminData);
      
      if (response.success) {
        setSuccess('Website admin created successfully!');
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: ''
        });
        
        // Navigate to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/website-admin/dashboard');
        }, 2000);
      } else {
        setError(response.message || 'Failed to create website admin');
      }
    } catch (error) {
      console.error('Create admin error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-admin-container">
      <div className="create-admin-header">
        <h1>Create Website Admin</h1>
        <p>Add a new website administrator to the system</p>
      </div>

      <div className="create-admin-form-container">
        <form onSubmit={handleSubmit} className="create-admin-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="fullName">Full Name *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={validationErrors.fullName ? 'error' : ''}
              placeholder="Enter full name"
              disabled={loading}
            />
            {validationErrors.fullName && (
              <span className="field-error">{validationErrors.fullName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={validationErrors.email ? 'error' : ''}
              placeholder="Enter email address"
              disabled={loading}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={validationErrors.password ? 'error' : ''}
              placeholder="Enter password (min 8 characters)"
              disabled={loading}
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={validationErrors.confirmPassword ? 'error' : ''}
              placeholder="Confirm password"
              disabled={loading}
            />
            {validationErrors.confirmPassword && (
              <span className="field-error">{validationErrors.confirmPassword}</span>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/website-admin/dashboard')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .create-admin-container {
          padding: 2rem;
          width: 100%;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .access-denied-container {
          text-align: center;
          padding: 3rem;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
        }

        .access-denied-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .access-denied-container h2 {
          color: #dc2626;
          margin-bottom: 1rem;
        }

        .access-denied-container p {
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .access-denied-actions {
          margin-top: 2rem;
        }

        .create-admin-header {
          margin-bottom: 2rem;
        }

        .back-button {
          background: none;
          border: none;
          color: #4f46e5;
          cursor: pointer;
          font-size: 1rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .back-button:hover {
          text-decoration: underline;
        }

        .create-admin-header h1 {
          margin: 0 0 0.5rem 0;
          color: #111827;
        }

        .create-admin-header p {
          color: #6b7280;
          margin: 0;
        }

        .create-admin-form-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 2rem;
        }

        .create-admin-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-group input.error {
          border-color: #ef4444;
        }

        .form-group input:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
        }

        .field-error {
          color: #ef4444;
          font-size: 0.875rem;
        }

        .error-message {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .success-message {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #4f46e5;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #4338ca;
        }

        .btn-secondary {
          background-color: #6b7280;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default CreateAdmin;