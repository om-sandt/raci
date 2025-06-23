import React from 'react';
import '../../styles/form.scss';

const EventMaster = () => (
  <div className="form-container">
    <h2>Event Master</h2>
    <form>
      <label>
        Name of the Event
        <input type="text" name="eventName" required />
      </label>
      <label>
        Description
        <textarea name="description" />
      </label>
      <label>
        Department
        <input type="text" name="department" />
      </label>
      <label>
        Head of Department
        <input type="text" name="hod" />
      </label>
      <label>
        Employee List
        <input type="text" name="employeeList" />
      </label>
      <label>
        Document Uploader
        <input type="file" name="documents" multiple />
      </label>
      <button type="button">Submit for Approval</button>
    </form>
  </div>
);

export default EventMaster;
