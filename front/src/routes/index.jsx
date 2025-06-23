import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DepartmentManagement from "../pages/DepartmentManagement";
import CreateDepartment from "../pages/CreateDepartment";
import NotFound from "../pages/NotFound";

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route
          path="/company-admin/department-management"
          element={<DepartmentManagement />}
        />
        <Route
          path="/company-admin/department-creation"
          element={<CreateDepartment />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;