import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../src/services/auth.service';
import '../../styles/auth.scss';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Login attempt with:', formData.email);
      const response = await authService.login(formData.email, formData.password);
      console.log('Login successful, complete response:', response);
      
      // Store the entire user object for debugging
      localStorage.setItem('current_user', JSON.stringify(response.user || response));
      
      // Extract user and role information from the response
      const user = response.user || response;
      
      // Check if user has a default password that needs to be changed
      if (user.isDefaultPassword) {
        console.log('User has default password, redirecting to change password page');
        navigate('/auth/change-password', { state: { isFirstLogin: true } });
        return;
      }
      
      // Force redirect based on role using window.location
      if (user && user.role) {
        const role = user.role.toLowerCase();
        console.log('User role detected:', role);
        
        // Direct redirection with window.location instead of navigate()
        if (role === 'website_admin' || role.includes('website')) {
          console.log('Redirecting to website admin dashboard');
          window.location.href = '/website-admin/dashboard';
        } 
        else if (role === 'company_admin' || role.includes('company')) {
          console.log('Redirecting to company admin dashboard');
          window.location.href = '/company-admin/dashboard';
        }
        else if (role === 'hod' || role.includes('head')) {
          console.log('Redirecting to user dashboard (HOD)');
          window.location.href = '/user/raci-dashboard';
        }
        else {
          console.log('Redirecting to user dashboard');
          window.location.href = '/user/raci-dashboard';
        }
      } else {
        console.error('Invalid response structure:', response);
        setError('Login successful but unable to determine user role');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <div className="logo-icon">🔄</div>
            <h1>Sharp RACI</h1>
          </div>
          <p>Sign in to your account</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                required
              />
              <span className="input-icon">✉️</span>
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">Password</label>
              <Link to="/auth/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>
            <div className="input-wrapper">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
              />
              <span className="input-icon">🔒</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
            {/* <br />
          <p>
            Don't have an account?{' '}
            <Link to="/auth/register" className="auth-link">
              Register
            </Link>
          </p> */}
        </div>
      </div>
    </div>
  );
};

export default Login;

