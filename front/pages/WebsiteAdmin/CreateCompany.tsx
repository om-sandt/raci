import React from 'react';
import '../../styles/form.scss';

const CreateCompany = () => (
  <div className="form-container">
    <h2>Create Company</h2>
    <form>
      <label>
        Name of the Company
        <input type="text" name="companyName" required />
      </label>
      <label>
        Logo of the Company
        <input type="file" name="companyLogo" accept="image/*" />
      </label>
      <button type="submit">Create</button>
    </form>
  </div>
);

export default CreateCompany;
