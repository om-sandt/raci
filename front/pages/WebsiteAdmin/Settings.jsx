import React, { useState } from 'react';

const Settings = () => {
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'Sharp RACI',
    adminEmail: 'admin@racisaas.com',
    notificationsEnabled: true,
    automaticApprovals: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiryDays: 90,
    requireStrongPasswords: true
  });

  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGeneralSettings({
      ...generalSettings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecuritySettings({
      ...securitySettings,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value) : value
    });
  };

  const handleGeneralSubmit = (e) => {
    e.preventDefault();
    alert('General settings updated!');
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    alert('Security settings updated!');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Admin Settings</h1>
        <p>Configure platform settings and preferences</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>General Settings</h2>
        </div>
        <form onSubmit={handleGeneralSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="platformName">Platform Name</label>
              <input
                type="text"
                id="platformName"
                name="platformName"
                value={generalSettings.platformName}
                onChange={handleGeneralChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="adminEmail">Admin Email</label>
              <input
                type="email"
                id="adminEmail"
                name="adminEmail"
                value={generalSettings.adminEmail}
                onChange={handleGeneralChange}
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="notificationsEnabled"
                  checked={generalSettings.notificationsEnabled}
                  onChange={handleGeneralChange}
                />
                Enable Email Notifications
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="automaticApprovals"
                  checked={generalSettings.automaticApprovals}
                  onChange={handleGeneralChange}
                />
                Enable Automatic Approvals
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Save General Settings</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Security Settings</h2>
        </div>
        <form onSubmit={handleSecuritySubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="twoFactorAuth"
                  checked={securitySettings.twoFactorAuth}
                  onChange={handleSecurityChange}
                />
                Enable Two-Factor Authentication
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="sessionTimeout">Session Timeout (minutes)</label>
              <input
                type="number"
                id="sessionTimeout"
                name="sessionTimeout"
                value={securitySettings.sessionTimeout}
                onChange={handleSecurityChange}
                min="5"
                max="120"
              />
            </div>
            <div className="form-group">
              <label htmlFor="passwordExpiryDays">Password Expiry (days)</label>
              <input
                type="number"
                id="passwordExpiryDays"
                name="passwordExpiryDays"
                value={securitySettings.passwordExpiryDays}
                onChange={handleSecurityChange}
                min="30"
                max="365"
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="requireStrongPasswords"
                  checked={securitySettings.requireStrongPasswords}
                  onChange={handleSecurityChange}
                />
                Require Strong Passwords
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Save Security Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
