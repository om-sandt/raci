import React from "react";
import { Routes, Route } from "react-router-dom";
import Overview from "./Overview";
import Departments from "./Departments";
import Users from "./Users";
import Events from "./Events";
import EventDetails from "./EventDetails";
import CreateEvent from "./CreateEvent";
import CreateRaciMatrix from "./CreateRaciMatrix";
import UpdateRaciMatrix from "./UpdateRaciMatrix";
import UserProfile from "./UserProfile";
import HelpSupport from "./HelpSupport";

const CompanyAdminDashboard = ({ user }) => {
  return (
    <div>
      <Routes>
        <Route path="/dashboard" element={<Overview />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/users" element={<Users />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/events/create" element={<CreateEvent />} />
        <Route path="/events/:eventId/raci" element={<CreateRaciMatrix />} />
        <Route path="/events/:eventId/raci/edit" element={<UpdateRaciMatrix />} />
        <Route path="/profile" element={<UserProfile userData={user} />} />
        <Route path="/help" element={<HelpSupport />} />
      </Routes>
    </div>
  );
};

export default CompanyAdminDashboard;