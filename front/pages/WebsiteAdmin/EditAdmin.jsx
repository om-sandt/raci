import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/editAdmin.scss';

const EditAdmin = () => {
  const [adminData, setAdminData] = useState({
    fullName: '',
    email: '',
    phone: '',
    // Add other existing fields
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    // Fetch admin data including photo
    const fetchAdminData = async () => {
      try {
        const adminId = /* get admin ID from route params */;
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/website-admins/${adminId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setAdminData({
          fullName: response.data.full_name,
          email: response.data.email,
          phone: response.data.phone,
          // Add other fields
        });
        
        if (response.data.photo) {
          setPhotoPreview(response.data.photo);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      }
    };
    
    fetchAdminData();
  }, []);
  
  // Handle photo upload
  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Create a FormData object to send the multipart/form-data
      const formData = new FormData();
      
      // Append all the form fields
      Object.keys(adminData).forEach(key => {
        formData.append(key, adminData[key]);
      });
      
      // Append the photo if there is one
      if (photo) {
        formData.append('photo', photo);
      }
      
      // Send the form data to the API
      const adminId = /* get admin ID from route params */;
      const response = await axios.put(`/api/website-admins/${adminId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming token is stored in localStorage
        }
      });
      
      // Handle successful response
      // ...existing success handling code...
      
    } catch (error) {
      // Handle error
      // ...existing error handling code...
    }
  };
  
  return (
    <div className="edit-admin-container">
      <h2>Edit Admin</h2>
      <form onSubmit={handleSubmit}>
        {/* Existing form fields */}
        
        {/* Add photo upload field */}
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
        
        {/* Existing submit button */}
        <button type="submit" className="submit-button">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditAdmin;