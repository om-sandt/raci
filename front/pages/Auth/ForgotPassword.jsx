import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../src/services/auth.service';
import '../../styles/auth.scss';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update to use new API endpoint
      await authService.post('/auth/forgot-password', { email: email });
      
      setSuccess('If an account exists with this email, you will receive an OTP to reset your password.');
      
      // Store email for OTP verification
      localStorage.setItem('reset_email', email);
      
      // Redirect to OTP verification page
      setTimeout(() => {
        navigate('/auth/verify-otp');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <div className="logo-icon">🔄</div>
            <h1>RACI SaaS</h1>
          </div>
          <p>Forgot Password</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            <span>{success}</span>
          </div>
        )}

        <p className="auth-instruction">
          Enter your email address and we'll send you a verification code to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
              <span className="input-icon">✉️</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <Link to="/auth/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

