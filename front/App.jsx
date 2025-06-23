import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CompanyAdminLayout from './layouts/CompanyAdminLayout';
import DepartmentManagement from './pages/CompanyAdmin/DepartmentManagement';
import CreateDepartment from './pages/CompanyAdmin/CreateDepartment';
// Import other components as needed

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/company-admin" element={<CompanyAdminLayout />}>
          <Route path="departments" element={<DepartmentManagement />} />
          <Route path="create-department" element={<CreateDepartment />} />
          {/* Add other routes as needed */}
        </Route>
        {/* Add other routes as needed */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
