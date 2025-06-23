import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/CompanyAdmin/Sidebar';

const CompanyAdminLayout = () => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default CompanyAdminLayout;
