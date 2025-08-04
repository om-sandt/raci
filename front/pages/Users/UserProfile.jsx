import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../src/services/auth.service';

const UserProfile = ({ userData: propUserData }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    phone: "",
  });
  
  // Debug logging to track incoming props
  console.log("UserProfile received userData:", propUserData);
  console.log("Department from props:", propUserData?.department);
  
  useEffect(() => {
    // If user data is provided via props, use it
    if (propUserData && Object.keys(propUserData).length > 0) {
      // Create a clean copy of user data to avoid reference issues
      const processedUser = {
        ...propUserData,
        // Ensure department and company are properly formatted
        department: propUserData.department || {},
        company: propUserData.company || {}
      };
      
      console.log("Setting user state with:", processedUser);
      setUser(processedUser);
      
      setFormData({
        name: processedUser.name || "",
        designation: processedUser.designation || "",
        phone: processedUser.phone || "",
      });
      setLoading(false);
    } else {
      // Otherwise, fetch user data
      const fetchUserData = async () => {
        try {
          setLoading(true);
          const userData = await authService.getCurrentUser();
          console.log("Fetched user data for profile:", userData);
          
          if (userData) {
            // Format the user data
            const formattedUser = {
              name: userData.name || "",
              email: userData.email || "",
              role: userData.role || "",
              designation: userData.designation || "",
              phone: userData.phone || "",
              employeeId: userData.employeeId || "",
              department: userData.department || { name: "" },
              company: userData.company || { name: "" },
              profileImage: userData.profileImage || null
            };
            
            console.log("Formatted user data:", formattedUser);
            console.log("Department from API:", formattedUser.department);
            
            setUser(formattedUser);
            setFormData({
              name: formattedUser.name,
              designation: formattedUser.designation,
              phone: formattedUser.phone,
            });
          }
        } catch (error) {
          console.error("Failed to load user profile data:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchUserData();
    }
  }, [propUserData]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically update the user information via API
    console.log("Form submitted with data:", formData);
    
    // Update local state to reflect changes
    setUser(prev => ({
      ...prev,
      name: formData.name,
      designation: formData.designation,
      phone: formData.phone
    }));
    
    setEditMode(false);
  };

  const handleBackToDashboard = () => {
    navigate('/user/raci-dashboard');
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '50%', 
          border: '3px solid #f3f3f3', 
          borderTop: '3px solid #4f46e5', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto' 
        }}></div>
        <p style={{ marginTop: '1rem', color: '#4f46e5' }}>Loading profile...</p>
      </div>
    );
  }
  
  // Helper function to safely get department name
  const getDepartmentName = () => {
    if (!user) return "";
    if (!user.department) return "";
    
    // Handle department as object with name property
    if (typeof user.department === 'object' && user.department.name) {
      return user.department.name;
    }
    
    // Handle department as string
    if (typeof user.department === 'string') {
      return user.department;
    }
    
    return "";
  };

  // Helper function to safely get company name
  const getCompanyName = () => {
    if (!user) return "";
    if (!user.company) return "";
    
    // Handle company as object with name property
    if (typeof user.company === 'object' && user.company.name) {
      return user.company.name;
    }
    
    // Handle company as string
    if (typeof user.company === 'string') {
      return user.company;
    }
    
    return "";
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header" style={{ position: 'relative', marginBottom: '2rem' }}>
        <h1 style={{ textAlign: 'center', margin: 0 }}>My Profile</h1>
        <p style={{ textAlign: 'center', margin: '0.5rem 0 0 0' }}>View and manage your profile information</p>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            border: '3px solid #f3f3f3', 
            borderTop: '3px solid #4f46e5', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto' 
          }}></div>
          <p style={{ marginTop: '1rem', color: '#4f46e5' }}>Loading profile...</p>
        </div>
      ) : (
        <div className="profile-container" style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '2rem'
        }}>
          <div className="profile-sidebar card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            {/* Avatar section */}
            <div className="avatar" style={{ 
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: '#4f46e5',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: 'bold',
              margin: '0 auto 1.5rem'
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>{user.name}</h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{user.designation || ""}</p>
            
            <div className="user-role-badge" style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '1.5rem'
            }}>
              {user.role || "User"}
            </div>
            
            {/* Company Info */}
            <div className="company-info" style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Company</div>
              <div style={{ color: '#6b7280' }}>
                {getCompanyName()}
              </div>
            </div>
            
            {/* Department Info */}
            <div className="department-info">
              <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Department</div>
              <div style={{ color: '#6b7280' }}>
                {getDepartmentName()}
              </div>
            </div>
            
            {!editMode && (
              <button 
                className="btn btn-primary" 
                onClick={() => setEditMode(true)}
                style={{ 
                  marginTop: '1.5rem',
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Edit Profile
              </button>
            )}
          </div>
          
          <div className="profile-details card" style={{ padding: '1.5rem' }}>
            {editMode ? (
              // Edit mode form
              <form onSubmit={(e) => {
                e.preventDefault();
                setUser({...user, ...formData});
                setEditMode(false);
              }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Edit Profile Information</h2>
                
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="designation" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Designation</label>
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                
                <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.25rem',
                      backgroundColor: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              // View mode details
              <>
                <h2 style={{ marginBottom: '1.5rem' }}>Profile Information</h2>
                
                <div className="info-grid" style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  {/* Basic info items */}
                  <div className="info-item">
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Full Name</div>
                    <div style={{ fontWeight: '500' }}>{user.name || ""}</div>
                  </div>
                  
                  <div className="info-item">
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</div>
                    <div style={{ fontWeight: '500' }}>{user.email || ""}</div>
                  </div>
                  
                  <div className="info-item">
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Designation</div>
                    <div style={{ fontWeight: '500' }}>{user.designation || ""}</div>
                  </div>
                  
                  <div className="info-item">
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Phone</div>
                    <div style={{ fontWeight: '500' }}>{user.phone || ""}</div>
                  </div>
                  
                  <div className="info-item">
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Employee ID</div>
                    <div style={{ fontWeight: '500' }}>{user.employeeId || ""}</div>
                  </div>
                  
                  <div className="info-item">
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Role</div>
                    <div style={{ fontWeight: '500' }}>{user.role || ""}</div>
                  </div>
                  
                  {/* Company and Department info */}
                  <div className="info-item">
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Company</div>
                    <div style={{ fontWeight: '500' }}>
                      {getCompanyName()}
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Department</div>
                    <div style={{ fontWeight: '500' }}>
                      {getDepartmentName()}
                    </div>
                  </div>
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: '500', margin: '1.5rem 0 1rem' }}>Account Security</h3>
                
                <button style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#f9fafb',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}>
                  <span>🔐</span> Change Password
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;

