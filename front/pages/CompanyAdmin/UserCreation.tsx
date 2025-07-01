import React from 'react';
import '../../styles/form.scss';

const UserCreation = () => (
  <div className="form-container">
    <h2>Create User</h2>
    <form>
      <label>
        Name of User
        <input type="text" name="userName" required />
      </label>
      <label>
        Designation
        <input type="text" name="designation" />
      </label>
      <label>
        Email
        <input type="email" name="email" required />
      </label>
      <label>
        Phone No
        <input type="tel" name="phone" />
      </label>
      <label>
        Employee ID
        <input type="text" name="employeeId" />
      </label>
      <label>
        Role
        <select name="role">
          <option value="hod">HOD</option>
          <option value="user">User</option>
          <option value="companyAdmin">Company Admin</option>
        </select>
      </label>
      <button type="submit">Create</button>
    </form>
  </div>
);

export default UserCreation;
