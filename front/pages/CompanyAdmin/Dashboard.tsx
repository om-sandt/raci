import React, { useState, useEffect } from 'react';
import '../../styles/dashboard.scss';
import authService from '../../src/services/auth.service';
import env from '../../src/config/env';

const CompanyAdminDashboard = ({ children }: { children?: React.ReactNode }) => {
  const [companyData, setCompanyData] = useState<any>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user?.company?.id) {
          const token = localStorage.getItem('raci_auth_token');
          const res = await fetch(`${env.apiBaseUrl}/companies/${user.company.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            setCompanyData(await res.json());
          } else {
            setCompanyData(user.company);
          }
        }
      } catch (e) {
        console.error('Failed to load company', e);
      }
    };
    fetchCompany();
  }, []);

  const renderCompanyLogo = () => {
    if (!companyData) return null;
    const rawLogo = companyData.logoUrl || companyData.logo;
    if (rawLogo) {
      const src = rawLogo.startsWith('http') ? rawLogo : `${window.location.protocol}//${window.location.hostname}:5000${rawLogo}`;
      return (
        <img src={src} alt={companyData.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
      );
    }
    return (
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
        {companyData?.name?.charAt(0).toUpperCase() || 'C'}
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {renderCompanyLogo()}
          <span style={{ marginLeft: '10px', fontWeight: 600, color: 'white' }}>{companyData ? companyData.name : 'Company Admin'}</span>
        </div>
        <nav>
          <a href="/CompanyAdmin/UserCreation">User Creation</a>
          <a href="/CompanyAdmin/DepartmentManagement">Department Management</a>
          <a href="/CompanyAdmin/UserManagement">User Management</a>
          <a href="/CompanyAdmin/EventMaster">Event Master</a>
          <a href="/CompanyAdmin/RACIAssignment">RACI Assignment</a>
          <a href="/CompanyAdmin/RACITracker">RACI Tracker</a>
          <a href="/Home">Back to Home</a>
        </nav>
      </aside>
      <main className="dashboard-content">
        <h1>Company Admin Dashboard</h1>
        <p>Select an option from the sidebar.</p>
        {children}
      </main>
    </div>
  );
};

export default CompanyAdminDashboard;
