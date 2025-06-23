import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../styles/createAdmin.scss';

const CreateAdmin = () => {
  const [adminData, setAdminData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdminData({
      ...adminData,
      [name]: value,
    });
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      Object.keys(adminData).forEach(key => {
        formData.append(key, adminData[key]);
      });

      if (photo) {
        formData.append('photo', photo);
      }

      const response = await axios.post('/api/website-admins', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Handle successful response

    } catch (error) {
      // Handle error
    }
  };

  return (
    <div className="create-admin-container">
      <h2>Create New Admin</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" name="fullName" value={adminData.fullName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" value={adminData.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input type="tel" name="phone" value={adminData.phone} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" name="password" value={adminData.password} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Profile Photo</label>
          <div className="photo-upload-container">
            {photoPreview && (
              <div className="photo-preview">
                <img
                  src={photoPreview}
                  alt="Profile Preview"
                  style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>
            )}
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="upload-button"
              onClick={() => fileInputRef.current.click()}
              style={{
                padding: '8px 16px',
                marginTop: '10px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {photoPreview ? 'Change Photo' : 'Upload Photo'}
            </button>
          </div>
        </div>
        <button type="submit" className="submit-button">
          Create Admin
        </button>
      </form>
    </div>
  );
};

export default CreateAdmin;