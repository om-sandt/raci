import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import WebsiteAdminDashboard from '../pages/WebsiteAdmin/Dashboard';
import CompanyAdminDashboard from '../pages/CompanyAdmin/Dashboard';
import UserDashboard from '../pages/Users/Dashboard';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import VerifyOTP from '../pages/Auth/VerifyOTP';
import CreatePassword from '../pages/Auth/CreatePassword';
import ForgotPassword from '../pages/Auth/ForgotPassword';
import ChangePassword from '../pages/Auth/ChangePassword';
import CreateDepartment from '../pages/CompanyAdmin/CreateDepartment';
import UserManagement from '../pages/CompanyAdmin/UserManagement';
import CreateUser from '../pages/CompanyAdmin/CreateUser';
import EditUser from '../pages/CompanyAdmin/EditUser';
import DepartmentManagement from '../pages/CompanyAdmin/DepartmentManagement';
import EventList from '../pages/CompanyAdmin/EventList';
import RACITracker from '../pages/CompanyAdmin/RACITracker';
import EventMaster from '../pages/CompanyAdmin/EventMaster';
import './App.css';
import '../styles/global.scss';

// Auth guard component to protect routes
const PrivateRoute = ({ element }) => {
  const isAuthenticated = localStorage.getItem('raci_auth_token');
  return isAuthenticated ? element : <Navigate to="/auth/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/website-admin/*" element={
          <PrivateRoute element={<WebsiteAdminDashboard />} />
        } />
        <Route path="/company-admin/*" element={
          <PrivateRoute element={<CompanyAdminDashboard />} />
        } />
        <Route path="/user/*" element={
          <PrivateRoute element={<UserDashboard />} />
        } />
        
        {/* Auth Routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/verify-otp" element={<VerifyOTP />} />
        <Route path="/auth/create-password" element={<CreatePassword />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/change-password" element={<ChangePassword />} />
        
        {/* Company Admin – specific pages first */}
        <Route path="/company-admin/event-master" element={<PrivateRoute element={<EventMaster />} />} />
        <Route path="/company-admin/events/edit/:id" element={<PrivateRoute element={<EventMaster />} />} />
        <Route path="/company-admin/event-list" element={<PrivateRoute element={<EventList />} />} />
        <Route path="/company-admin/raci-tracker" element={<PrivateRoute element={<RACITracker />} />} />

        {/* Fallback / dashboard routes */}
        <Route path="/company-admin/users" element={<PrivateRoute element={<UserManagement />} />} />
        <Route path="/company-admin/users/create" element={<PrivateRoute element={<CreateUser />} />} />
        <Route path="/company-admin/users/edit/:id" element={<PrivateRoute element={<EditUser />} />} />
        <Route path="/company-admin/departments" element={<PrivateRoute element={<DepartmentManagement />} />} />
        <Route path="/company-admin/departments/create" element={<PrivateRoute element={<CreateDepartment />} />} />
        <Route path="/company-admin/department-management" element={<DepartmentManagement />} />
        <Route path="/company-admin/department-creation" element={<CreateDepartment />} />
        {/* Dashboard (overview) */}
        <Route path="/company-admin/dashboard" element={<PrivateRoute element={<CompanyAdminDashboard />} />} />
        {/* Root & wildcard */}
        <Route path="/company-admin" element={<PrivateRoute element={<CompanyAdminDashboard />} />} />
        <Route path="/company-admin/*" element={<PrivateRoute element={<CompanyAdminDashboard />} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

