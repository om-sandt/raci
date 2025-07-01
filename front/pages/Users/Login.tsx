import React from 'react';
import '../../styles/form.scss';

const Login = () => (
  <div className="form-container">
    <h2>User Login</h2>
    <form>
      <label>
        Email
        <input type="email" name="email" required />
      </label>
      <label>
        Password
        <input type="password" name="password" required />
      </label>
      <button type="submit">Login</button>
    </form>
  </div>
);

export default Login;
