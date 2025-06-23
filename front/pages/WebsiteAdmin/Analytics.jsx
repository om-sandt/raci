import React from 'react';

const Analytics = () => {
  // Mock data for analytics
  const stats = [
    { id: 1, label: 'Total Companies', value: 24, icon: '🏢', color: 'primary' },
    { id: 2, label: 'Active Admins', value: 36, icon: '👥', color: 'secondary' },
    { id: 3, label: 'This Month', value: '+5', icon: '📈', color: 'success' },
    { id: 4, label: 'Pending Approvals', value: 8, icon: '⏳', color: 'warning' },
  ];

  const recentCompanies = [
    { name: 'TechCorp Inc', admins: 5, status: 'active', created: '2023-06-12' },
    { name: 'Global Services Ltd', admins: 3, status: 'active', created: '2023-06-10' },
    { name: 'Modern Solutions', admins: 2, status: 'pending', created: '2023-06-08' },
    { name: 'Innovative Tech', admins: 4, status: 'active', created: '2023-06-05' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p>Overview of platform usage and statistics</p>
      </div>

      {/* Stat widgets */}
      <div className="widget-grid">
        {stats.map(stat => (
          <div key={stat.id} className={`widget ${stat.color}`}>
            <div className="widget-value">{stat.value}</div>
            <div className="widget-label">{stat.label}</div>
            <div className="widget-icon">{stat.icon}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-header">
          <h2>Recently Added Companies</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Admins</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentCompanies.map((company, index) => (
                <tr key={index}>
                  <td>{company.name}</td>
                  <td>{company.admins}</td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      backgroundColor: company.status === 'active' ? '#e7f7ef' : '#fff3cd',
                      color: company.status === 'active' ? '#10b981' : '#f59e0b'
                    }}>
                      {company.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td>{company.created}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}>
                      View
                    </button>
                    <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage chart */}
      <div className="card">
        <div className="card-header">
          <h2>Platform Usage</h2>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ 
            height: '300px',
            background: 'linear-gradient(180deg, rgba(79, 70, 229, 0.1) 0%, rgba(79, 70, 229, 0.02) 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Analytics chart would be rendered here
            </p>
          </div>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-around', 
            marginTop: '1rem',
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            {['Companies', 'Users', 'Events', 'RACI Matrices'].map((category, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#4f46e5' }}>
                  {Math.floor(Math.random() * 100) + 20}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {category}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
