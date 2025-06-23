import React from 'react';
import '../../styles/form.scss';

const CreateCompanyAdmin = () => (
  <div className="form-container">
    <h2>Create Company Admin</h2>
    <form>
      <label>
        Full Name
        <input type="text" name="adminName" required />
      </label>
      <label>
        Email
        <input type="email" name="email" required />
      </label>
      <label>
        Designation
        <input type="text" name="designation" />
      </label>
      <label>
        Phone No
        <input type="tel" name="phone" />
      </label>
      <label>
        Domain of the Company
        <input type="text" name="domain" />
      </label>
      <label>
        Employee ID
        <input type="text" name="employeeId" />
      </label>
      <button type="submit">Assign</button>
    </form>
  </div>
);

export default CreateCompanyAdmin;
