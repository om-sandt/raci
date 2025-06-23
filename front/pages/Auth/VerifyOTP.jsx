import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../src/services/api';
import '../../styles/auth.scss';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const resetEmail = localStorage.getItem('reset_email');
    if (!resetEmail) {
      // Redirect to forgot password if email not found
      navigate('/auth/forgot-password');
    } else {
      setEmail(resetEmail);
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call verify OTP endpoint
      const response = await apiService.post('/auth/verify-otp', {
        email,
        otp: formData.otp
      });
      
      // Store reset token for password reset
      if (response.resetToken) {
        localStorage.setItem('reset_token', response.resetToken);
      }
      
      // Redirect to create password page
      navigate('/auth/create-password');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Verify OTP</h1>
        <p className="auth-subtitle">
          Enter the verification code sent to {email || 'your email'}
        </p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="otp">Verification Code</label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              required
              placeholder="Enter 6-digit code"
              maxLength="6"
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        
        <div className="auth-links">
          <button 
            onClick={() => navigate('/auth/forgot-password')}
            className="text-button"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
  