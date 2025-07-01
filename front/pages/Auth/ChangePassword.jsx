import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import apiService from '../../src/services/api';
import '../../styles/auth.scss';

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const isFirstLogin = location.state?.isFirstLogin || false;
  
  // If the user is not logged in and not coming from login page, redirect to login
  useEffect(() => {
    const token = localStorage.getItem('raci_auth_token');
    if (!token && !isFirstLogin) {
      navigate('/auth/login');
    }
  }, [navigate, isFirstLogin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiService.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      setSuccess('Password changed successfully! Redirecting to dashboard...');
      
      // Update stored user info to reflect password change
      const userString = localStorage.getItem('current_user');
      if (userString) {
        try {
          const user = JSON.parse(userString);
          user.isDefaultPassword = false;
          localStorage.setItem('current_user', JSON.stringify(user));
        } catch (e) {
          console.error('Error updating user data:', e);
        }
      }
      
      // Redirect based on user role after successful password change
      setTimeout(() => {
        const userString = localStorage.getItem('current_user');
        if (userString) {
          try {
            const user = JSON.parse(userString);
            const role = user.role ? user.role.toLowerCase() : '';
            
            if (role.includes('website')) {
              navigate('/website-admin');
            } else if (role.includes('company')) {
              navigate('/company-admin');
            } else {
              navigate('/user');
            }
          } catch (e) {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '1rem'
    }}>
      <div className="auth-card" style={{
        width: '100%',
        maxWidth: '480px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '2.5rem',
        animation: 'fadeIn 0.5s ease'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700', 
            color: '#1e293b',
            marginBottom: '0.75rem'
          }}>
            {isFirstLogin ? 'Create New Password' : 'Change Password'}
          </h1>
          
          {isFirstLogin && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: '#f0f9ff',
              color: '#0369a1',
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              border: '1px solid #bae6fd'
            }}>
              <strong>Welcome!</strong> You're using a temporary password. 
              Please create a new password to continue.
            </div>
          )}
        </div>
        
        {error && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: '0.95rem',
            marginBottom: '1.5rem',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: '#f0fdf4',
            color: '#15803d',
            fontSize: '0.95rem',
            marginBottom: '1.5rem',
            border: '1px solid #bbf7d0'
          }}>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="currentPassword"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#475569',
                fontWeight: '500',
                fontSize: '0.95rem'
              }}
            >
              {isFirstLogin ? 'Temporary Password' : 'Current Password'}
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              placeholder="Enter your current password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.15s ease'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="newPassword"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#475569',
                fontWeight: '500',
                fontSize: '0.95rem'
              }}
            >
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              placeholder="Enter new password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.15s ease'
              }}
            />
            <p style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.875rem',
              color: '#64748b'
            }}>
              Password must be at least 8 characters long
            </p>
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <label 
              htmlFor="confirmPassword"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#475569',
                fontWeight: '500',
                fontSize: '0.95rem'
              }}
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm new password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.15s ease'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: loading ? '#94a3b8' : 'linear-gradient(90deg, #4f46e5, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
        
        {!isFirstLogin && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link 
              to="/"
              style={{
                color: '#6366f1',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.95rem'
              }}
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
