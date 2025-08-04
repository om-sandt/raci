import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DepartmentManagement from "../pages/DepartmentManagement";
import CreateDepartment from "../pages/CreateDepartment";
import EditDepartment from "../../pages/CompanyAdmin/EditDepartment";
import CreateDesignation from "../../pages/CompanyAdmin/CreateDesignation";
import DesignationManagement from "../../pages/CompanyAdmin/DesignationManagement";
import CreateLocation from "../../pages/CompanyAdmin/CreateLocation";
import LocationManagement from "../../pages/CompanyAdmin/LocationManagement";
import DivisionManagement from "../../pages/CompanyAdmin/DivisionManagement";
import NotFound from "../pages/NotFound";
import CreateDivision from '../../pages/CompanyAdmin/CreateDivision';
import UpdateDivision from '../../pages/CompanyAdmin/UpdateDivision';

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
        <Route
          path="/company-admin/departments/edit/:id"
          element={<EditDepartment />}
        />
        <Route
          path="/company-admin/designation-creation"
          element={<CreateDesignation />}
        />
        <Route
          path="/company-admin/designation-management"
          element={<DesignationManagement />}
        />
        <Route
          path="/company-admin/location-creation"
          element={<CreateLocation />}
        />
        <Route
          path="/company-admin/location-management"
          element={<LocationManagement />}
        />
        <Route
          path="/company-admin/divisions"
          element={<DivisionManagement />}
        />
        <Route path="/company-admin/create-division" element={<CreateDivision />} />
        <Route path="/company-admin/update-division" element={<UpdateDivision />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;