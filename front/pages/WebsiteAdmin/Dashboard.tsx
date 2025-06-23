import React from 'react';
import '../../styles/dashboard.scss';

const WebsiteAdminDashboard = ({ children }: { children?: React.ReactNode }) => (
  <div className="dashboard-layout">
    <aside className="sidebar">
      <h2>Website Admin</h2>
      <nav>
        <a href="/WebsiteAdmin/CreateCompany">Create Company</a>
        <a href="/WebsiteAdmin/CreateCompanyAdmin">Create Company Admin</a>
        <a href="/Home">Back to Home</a>
      </nav>
    </aside>
    <main className="dashboard-content">
      <h1>Website Admin Dashboard</h1>
      <p>Select an option from the sidebar.</p>
      {children}
    </main>
  </div>
);

export default WebsiteAdminDashboard;
