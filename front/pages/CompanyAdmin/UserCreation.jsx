import React, { useState } from 'react';

const UserCreation = () => {
  const [userData, setUserData] = useState({
    name: '',
    designation: '',
    email: '',
    phone: '',
    employeeId: '',
    role: 'user'
  });

  const handleInputChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the data to your API
    console.log('Form submitted:', userData);
    // Placeholder for success message
    alert('User created successfully!');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Create User</h1>
        <p>Add a new user to your company</p>
      </div>
      <div className="card">
        <div className="card-header">
          <h2>User Information</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Name of User</label>
              <input
                type="text"
                id="name"
                name="name"
                value={userData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter user's name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter email address"
              />
            </div>
            <div className="form-group">
              <label htmlFor="designation">Designation</label>
              <input
                type="text"
                id="designation"
                name="designation"
                value={userData.designation}
                onChange={handleInputChange}
                placeholder="Enter designation"
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={userData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </div>
            <div className="form-group">
              <label htmlFor="employeeId">Employee ID</label>
              <input
                type="text"
                id="employeeId"
                name="employeeId"
                value={userData.employeeId}
                onChange={handleInputChange}
                placeholder="Enter employee ID"
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={userData.role}
                onChange={handleInputChange}
                required
              >
                <option value="hod">HOD</option>
                <option value="user">User</option>
                <option value="companyAdmin">Company Admin</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Create User</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreation;
