import React from 'react';
import '../../styles/dashboard.scss';

const UserDashboard = ({ children }: { children?: React.ReactNode }) => (
  <div className="dashboard-layout">
    <aside className="sidebar">
      <h2>User</h2>
      <nav>
        <a href="/Users/RACIDashboard">RACI Dashboard</a>
        <a href="/Users/Login">Login</a>
        <a href="/Home">Back to Home</a>
      </nav>
    </aside>
    <main className="dashboard-content">
      <h1>User Dashboard</h1>
      <p>Select an option from the sidebar.</p>
      {children}
    </main>
  </div>
);

export default UserDashboard;
