import React from 'react';
import '../../styles/form.scss';

const DepartmentManagement = () => (
  <div className="form-container">
    <h2>Department Management</h2>
    <form>
      <label>
        Name of the Department
        <input type="text" name="departmentName" required />
      </label>
      <label>
        HOD
        <input type="text" name="hod" />
      </label>
      <button type="submit">Add Department</button>
    </form>
  </div>
);

export default DepartmentManagement;
