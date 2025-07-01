import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Profile = () => {
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    // Add other existing fields
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    // Fetch user profile data including photo
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/website-admins/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setUserData({
          fullName: response.data.full_name,
          email: response.data.email,
          phone: response.data.phone,
          // Add other fields
        });
        
        if (response.data.photo) {
          setPhotoPreview(response.data.photo);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
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
      Object.keys(userData).forEach(key => {
        formData.append(key, userData[key]);
      });
      
      // Append the photo if there is one
      if (photo) {
        formData.append('photo', photo);
      }
      
      // Send the form data to the API
      const response = await axios.put('/api/website-admins/profile', formData, {
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
    <div className="profile-container">
      <h2>My Profile</h2>
      <form onSubmit={handleSubmit}>
        {/* Profile photo */}
        <div className="profile-photo-section">
          <div className="photo-container">
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt="Profile Preview" 
                style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div 
                style={{ 
                  width: '150px', 
                  height: '150px', 
                  borderRadius: '50%', 
                  backgroundColor: '#e2e8f0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: '#64748b'
                }}
              >
                {userData.fullName ? userData.fullName[0].toUpperCase() : '?'}
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
              className="change-photo-button"
              onClick={() => fileInputRef.current.click()}
              style={{
                padding: '8px 16px',
                marginTop: '15px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {photoPreview ? 'Change Photo' : 'Upload Photo'}
            </button>
          </div>
        </div>
        
        {/* Existing form fields */}
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={userData.fullName}
            onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={userData.email}
            readOnly // Email is typically not changeable
            disabled
          />
        </div>
        
        <div className="form-group">
          <label>Phone</label>
          <input
            type="text"
            name="phone"
            value={userData.phone}
            onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
          />
        </div>
        
        {/* Existing submit button */}
        <button type="submit" className="submit-button">
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default Profile;