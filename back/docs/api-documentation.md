# RACI SaaS Platform API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Website Admin Management](#website-admin-management)
- [User Management](#user-management)
- [Company Management](#company-management)
- [Department Management](#department-management)
- [Event Management](#event-management)
- [RACI Matrix Management](#raci-matrix-management)
- [User RACI Assignments](#user-raci-assignments)
- [HOD Department Management](#hod-department-management)
- [Meeting Management](#meeting-management)
- [Reference Data Management](#reference-data-management)
- [Dashboard & Analytics](#dashboard--analytics)

## Overview

### Base URL

```
http://localhost:9100/api
```

### Request Format

All API requests should be sent with the appropriate HTTP method (GET, POST, PUT, DELETE) and include the necessary headers:

- For authentication: `Authorization: Bearer YOUR_TOKEN`
- For content-type: `Content-Type: application/json` (for JSON payloads)
- For file uploads: Use `multipart/form-data`

### Response Format

Responses are returned in JSON format. Successful responses include the requested data, while error responses include an error message.

Successful response example:
```json
{
  "success": true,
  "data": { ... }
}
```

Error response example:
```json
{
  "success": false,
  "message": "Error description"
}
```

### Status Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Authenticated user doesn't have required permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Authentication

### Login

- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth required**: No
- **Description**: Authenticate a user and return tokens
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response**:
  ```json
  {
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "user": {
      "id": 1,
      "name": "User Name",
      "email": "user@example.com",
      "role": "user|company_admin|hod",
      "company": {
        "id": 1,
        "name": "Company Name"
      },
      "isDefaultPassword": true|false
    }
  }
  ```
- **Note**: If `isDefaultPassword` is `true`, the frontend should prompt the user to change their password.

### Change Password

- **URL**: `/auth/change-password`
- **Method**: `POST`
- **Auth required**: Yes
- **Description**: Change user's password, especially used when default password needs to be changed
- **Request Body**:
  ```json
  {
    "currentPassword": "current-password",
    "newPassword": "new-password"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```

### Forgot Password

- **URL**: `/auth/forgot-password`
- **Method**: `POST`
- **Auth required**: No
- **Description**: Initiate password reset process by sending OTP to user's email
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "OTP sent to your email address"
  }
  ```

### Verify OTP

- **URL**: `/auth/verify-otp`
- **Method**: `POST`
- **Auth required**: No
- **Description**: Verify the OTP sent during password reset
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "123456"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "OTP verified successfully",
    "resetToken": "reset-token-here"
  }
  ```

### Reset Password

- **URL**: `/auth/reset-password`
- **Method**: `POST`
- **Auth required**: No (requires reset token)
- **Description**: Reset password after OTP verification
- **Request Body**:
  ```json
  {
    "resetToken": "reset-token-from-verify-otp",
    "newPassword": "new-password"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Password reset successfully"
  }
  ```

## Website Admin Management

### Website Admin Login

- **URL**: `/website-admins/login`
- **Method**: `POST`
- **Auth required**: No
- **Description**: Authenticate a website admin and return tokens
- **Request Body**:
  ```json
  {
    "email": "omvataliya23@gmail.com",
    "password": "admin123"
  }
  ```
- **Success Response** (Main Admin):
  ```json
  {
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "user": {
      "id": 1,
      "name": "Om Vataliya",
      "email": "omvataliya23@gmail.com",
      "role": "website_admin",
      "phone": "6351497589",
      "canCreateAdmins": true,
      "isMainAdmin": true
    }
  }
  ```

- **Success Response** (Other Admin):
  ```json
  {
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "user": {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "website_admin",
      "phone": "1234567890",
      "canCreateAdmins": false,
      "isMainAdmin": false
    }
  }
  ```

### Get All Website Admins

- **URL**: `/website-admins`
- **Method**: `GET`
- **Auth required**: Yes (website_admin)
- **Description**: Get a list of all website admins
- **Success Response**:
  ```json
  [
    {
      "admin_id": 1,
      "full_name": "Om Vataliya",
      "email": "omvataliya23@gmail.com",
      "phone": "6351497589",
      "created_at": "2023-07-20T12:00:00Z"
    }
  ]
  ```

### Get Website Admin by ID

- **URL**: `/website-admins/{id}`
- **Method**: `GET`
- **Auth required**: Yes (website_admin)
- **Description**: Get details of a specific website admin
- **Success Response**:
  ```json
  {
    "admin_id": 1,
    "full_name": "Om Vataliya",
    "email": "omvataliya23@gmail.com",
    "phone": "6351497589",
    "created_at": "2023-07-20T12:00:00Z"
  }
  ```

### Create Website Admin

- **URL**: `/website-admins`
- **Method**: `POST`
- **Auth required**: Yes (website_admin with permission)
- **Description**: Create a new website admin
- **PERMISSION SYSTEM**: 
  - **Main Admin**: `omvataliya23@gmail.com` always has permission
  - **Other Admins**: Must have `canCreateAdmins` permission granted by main admin
- **Request Body**:
  ```json
  {
    "fullName": "New Admin",
    "email": "admin@example.com",
    "phone": "1234567890",
    "password": "securepassword"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "data": {
      "admin_id": 2,
      "full_name": "New Admin",
      "email": "admin@example.com",
      "phone": "1234567890",
      "canCreateAdmins": false,
      "created_at": "2023-07-21T12:00:00Z"
    }
  }
  ```
- **Error Response** (Unauthorized):
  ```json
  {
    "success": false,
    "message": "You are not authorized to create website admins. Contact omvataliya23@gmail.com for permission."
  }
  ```

### Get All Website Admins

- **URL**: `/website-admins`
- **Method**: `GET`
- **Auth required**: Yes (website_admin)
- **Description**: Get all website admins with their permission status
- **Success Response**:
  ```json
  [
    {
      "id": 1,
      "fullName": "Om Vataliya",
      "email": "omvataliya23@gmail.com",
      "phone": "6351497589",
      "canCreateAdmins": true,
      "createdAt": "2023-07-20T12:00:00Z"
    },
    {
      "id": 2,
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "canCreateAdmins": false,
      "createdAt": "2023-07-21T12:00:00Z"
    }
  ]
  ```

### Update Website Admin Permissions

- **URL**: `/website-admins/{id}/permissions`
- **Method**: `PATCH`
- **Auth required**: Yes (ONLY omvataliya23@gmail.com)
- **Description**: Grant or revoke admin creation permissions
- **Request Body**:
  ```json
  {
    "canCreateAdmins": true
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Admin permissions granted successfully",
    "data": {
      "id": 2,
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "canCreateAdmins": true,
      "updatedAt": "2023-07-21T13:00:00Z"
    }
  }
  ```

### Frontend Implementation Guide

#### Permission Checking

```javascript
// After login, check if user can create admins
const user = loginResponse.user;
const canCreateAdmins = user.canCreateAdmins;
const isMainAdmin = user.isMainAdmin;

// Show/hide create admin button
if (canCreateAdmins) {
  // Show create admin form
} else {
  // Hide create admin functionality
}

// Show/hide permission management (only for main admin)
if (isMainAdmin) {
  // Show permission toggle buttons for other admins
} else {
  // Hide permission management
}
```

#### Granting Permissions

```javascript
const grantPermission = async (adminId, canCreate) => {
  try {
    const response = await fetch(`/api/website-admins/${adminId}/permissions`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        canCreateAdmins: canCreate
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update UI to reflect new permission status
      console.log(result.message);
    } else {
      // Handle error
      console.error(result.message);
    }
  } catch (error) {
    console.error('Permission update failed:', error);
  }
};
```

### Update Website Admin

- **URL**: `/website-admins/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (website_admin)
- **Description**: Update an existing website admin
- **Request Body**:
  ```json
  {
    "fullName": "Updated Admin Name",
    "phone": "0987654321"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "data": {
      "admin_id": 1,
      "full_name": "Updated Admin Name",
      "email": "omvataliya23@gmail.com",
      "phone": "0987654321",
      "created_at": "2023-07-20T12:00:00Z",
      "updated_at": "2023-07-21T13:00:00Z"
    }
  }
  ```

### Delete Website Admin

- **URL**: `/website-admins/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (website_admin)
- **Description**: Delete a website admin (cannot delete last admin)
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Website admin deleted successfully"
  }
  ```
- **Error Response** (when meeting not found or access denied):
  ```json
  {
    "success": false,
    "message": "Meeting not found or access denied"
  }
  ```
  ```json
  {
    "success": false,
    "message": "Cannot delete the last website admin"
  }
  ```

## User Management

### Create User

- **URL**: `/users`
- **Method**: `POST`
- **Auth required**: Yes (company_admin or website_admin)
- **Description**: Create a new user (including company admins and department heads)
- **Content-Type**: `multipart/form-data`
- **Form Data Parameters**:
  - `name` (string, required)
  - `email` (string, required)
  - `role` (string, required) – one of `user`, `company_admin`, or `hod`
  - `designation` (string) – **required when `role` is `company_admin`**
  - `phone` (string)
  - `employeeId` (string)
  - `departmentId` (integer) – required for `role=hod`
  - `companyId` (integer)
  - `location` (string)
  - `photo` (file) – **required when `role` is `company_admin`**; ignored for other roles

- **Example: Creating a Company Admin (form-data key → value)**
  ```
  name        → Alice Smith
  email       → alice@acme.com
  role        → company_admin
  designation → Operations Manager
  phone       → +14155550123
  employeeId  → ACME-ADM-01
  companyId   → 1
  location    → San Francisco, USA
  photo       → (file) alice_profile.jpg
  ```

- **Success Response**:
  ```json
  {
    "id": 12,
    "name": "Alice Smith",
    "email": "alice@acme.com",
    "role": "company_admin",
    "designation": "Operations Manager",
    "phone": "+14155550123",
    "employeeId": "ACME-ADM-01",
    "photo": "/uploads/alice_profile.jpg",
    "location": "San Francisco, USA",
    "department": null,
    "company": {
      "id": 1,
      "name": "ACME Corporation"
    },
    "status": "pending",
    "tempPassword": "random-password",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
  ```

### Get All Users

- **URL**: `/users`
- **Method**: `GET`
- **Auth required**: Yes (company_admin or website_admin)
- **Description**: Get all users (with filtering)
- **Query Parameters**:
  - `companyId`: Filter by company
  - `departmentId`: Filter by department
  - `role`: Filter by role
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Success Response**:
  ```json
  {
    "totalItems": 50,
    "totalPages": 5,
    "currentPage": 1,
    "users": [
      {
        "id": 1,
        "name": "User Name",
        "email": "user@example.com",
        "role": "user|company_admin|hod",
        "designation": "Job Title",
        "phone": "+1234567890",
        "employeeId": "EMP123",
        "photo": "/uploads/profile-photo.jpg",
        "location": "New York, USA",
        "department": {
          "id": 1,
          "name": "Department Name"
        },
        "company": {
          "id": 1,
          "name": "Company Name"
        },
        "status": "active",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-02T00:00:00Z"
      }
    ]
  }
  ```

### Get User by ID

- **URL**: `/users/{id}`
- **Method**: `GET`
- **Auth required**: Yes
- **Description**: Get details of a specific user
- **Success Response**:
  ```json
  {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "role": "user|company_admin|hod",
    "designation": "Job Title",
    "phone": "+1234567890",
    "employeeId": "EMP123",
    "photo": "/uploads/profile-photo.jpg",
    "location": "New York, USA",
    "department": {
      "id": 1,
      "name": "Department Name"
    },
    "company": {
      "id": 1,
      "name": "Company Name"
    },
    "status": "active",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
  ```

### Update User

- **URL**: `/users/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (self, company_admin or website_admin)
- **Description**: Update user details
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  ```json
  {
    "name": "Updated Name",
    "designation": "Updated Title",
    "phone": "+1234567890",
    "departmentId": 1,
    "location": "San Francisco, USA",
    "photo": (file - only for company_admin role)
  }
  ```
- **Success Response**: 
  ```json
  {
    "id": 1,
    "name": "Updated Name",
    "email": "user@example.com",
    "role": "user|company_admin|hod",
    "designation": "Updated Title",
    "phone": "+1234567890",
    "employeeId": "EMP123",
    "photo": "/uploads/profile-photo.jpg",
    "location": "San Francisco, USA",
    "department": {
      "id": 1,
      "name": "Department Name"
    },
    "company": {
      "id": 1,
      "name": "Company Name"
    },
    "status": "active",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T14:30:00Z"
  }
  ```

### Delete User

- **URL**: `/users/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (company_admin or website_admin)
- **Description**: Delete a user
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```

## Company Management

### Create Company

- **URL**: `/companies`
- **Method**: `POST`
- **Auth required**: Yes (website_admin)
- **Description**: Create a new company
- **Notes**: `panId` is optional; if omitted it will be stored as `null`.
- **Content-Type**: `multipart/form-data`
- **Form Data Parameters**:
  - `name` (string, required)
  - `domain` (string)
  - `industry` (string)
  - `size` (string)
  - `panId` (string, optional)
  - `projectName` (string)
  - `logo` **or** `logoUrl` (file, optional) – company logo image
  - `project_logo` **or** `projectLogo` (file, optional) – project logo image
- **Example Request (key → value)**:
  ```
  name           → Company Name
  domain         → example.com
  industry       → Technology
  size           → 100-500
  panId          → AAAPL1234C
  projectName    → RACI Platform
  logo           → (file) company_logo.png
  project_logo   → (file) project_logo.png
  ```
- **Success Response**:
  ```json
  {
    "id": 1,
    "name": "Company Name",
    "logoUrl": "/uploads/logo-filename.png",
    "domain": "example.com",
    "industry": "Technology",
    "size": "100-500",
    "panId": "AAAPL1234C",
    "projectName": "RACI Platform",
    "projectLogo": "/uploads/project-logo.png",
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```

### Get All Companies

- **URL**: `/companies`
- **Method**: `GET`
- **Auth required**: Yes (website_admin)
- **Description**: Get all companies
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search by name/domain
- **Success Response**:
  ```json
  {
    "totalItems": 20,
    "totalPages": 2,
    "currentPage": 1,
    "companies": [
      {
        "id": 1,
        "name": "Company Name",
        "logoUrl": "/uploads/logo-filename.png",
        "projectLogo": "/uploads/project-logo.png",
        "domain": "example.com",
        "industry": "Technology",
        "size": "100-500",
        "adminsCount": 3,
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

### Get Company by ID

- **URL**: `/companies/{id}`
- **Method**: `GET`
- **Auth required**: Yes (website_admin, company_admin, hod, or any company member)
- **Description**: Get details of a specific company
- **Success Response**:
  ```json
  {
    "id": 1,
    "name": "Company Name",
    "logoUrl": "/uploads/logo-filename.png",
    "domain": "example.com",
    "industry": "Technology",
    "size": "100-500",
    "panId": "AAAPL1234C",
    "projectName": "RACI Platform",
    "projectLogo": "/uploads/project-logo.png",
    "settings": {
      "approvalWorkflow": "sequential",
      "defaultApprover": "department-head",
      "allowRejectionFeedback": true,
      "notifyOnApproval": true,
      "notifyOnRejection": true
    },
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
  ```

### Get My Company (For Company Admins)

- **URL**: `/companies/my-company`
- **Method**: `GET`
- **Auth required**: Yes (company_admin or hod)
- **Description**: Get the details of the company the authenticated user belongs to
- **Success Response**:
  ```json
  {
    "id": 1,
    "name": "Company Name",
    "logoUrl": "/uploads/logo-filename.png",
    "domain": "example.com",
    "industry": "Technology",
    "size": "100-500",
    "panId": "AAAPL1234C",
    "projectName": "RACI Platform",
    "projectLogo": "/uploads/project-logo.png",
    "settings": {
      "approvalWorkflow": "sequential",
      "defaultApprover": "department-head",
      "allowRejectionFeedback": true,
      "notifyOnApproval": true,
      "notifyOnRejection": true
    },
    "stats": {
      "totalUsers": 10,
      "totalDepartments": 3,
      "totalEvents": 25
    },
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
  ```

### Update Company

- **URL**: `/companies/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (website_admin or company_admin)
- **Description**: Update company details (any omitted field is left unchanged)
- **Notes**: `panId` remains optional during updates; providing a value will overwrite the existing one, while omitting it keeps the current value.
- **Content-Type**: `multipart/form-data`
- **Form Data Parameters** (send only the fields you need to change):
  - `name` (string)
  - `domain` (string)
  - `industry` (string)
  - `size` (string)
  - `panId` (string, optional)
  - `projectName` (string)
  - `logo` **or** `logoUrl` (file, optional)
  - `project_logo` **or** `projectLogo` (file, optional)
- **Example Request (partial)**:
  ```
  name         → Updated Company Name
  logo         → (file) new_logo.png
  project_logo → (file) new_project_logo.png
  ```
- **Success Response**: Updated company object

### Update Company Settings

- **URL**: `/companies/{id}/settings`
- **Method**: `PATCH`
- **Auth required**: Yes (company_admin)
- **Description**: Update company settings
- **Request Body**:
  ```json
  {
    "approvalWorkflow": "sequential|parallel|any",
    "defaultApprover": "department-head|company-admin",
    "allowRejectionFeedback": true,
    "notifyOnApproval": true,
    "notifyOnRejection": true
  }
  ```
- **Success Response**: Updated company object

### Delete Company

- **URL**: `/companies/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (website_admin)
- **Description**: Delete a company
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Company deleted successfully"
  }
  ```

## Department Management

### Create Department

- **URL**: `/companies/{companyId}/departments`
- **Method**: `POST`
- **Auth required**: Yes (company_admin)
- **Description**: Create a new department
- **Request Body**:
  ```json
  {
    "name": "Department Name",
    "hodId": 1  // Optional - can be assigned later
  }
  ```
- **Success Response**:
  ```json
  {
    "id": 1,
    "name": "Department Name",
    "hod": {
      "id": 1,
      "name": "HOD Name"
    },
    "company": {
      "id": 1,
      "name": "Company Name"
    },
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```
- **Notes**: 
  - `hodId` is optional when creating a department and can be assigned later using the Update Department endpoint
  - Only company admins can create departments for their company

### Get All Departments

- **URL**: `/companies/{companyId}/departments`
- **Method**: `GET`
- **Auth required**: Yes (company member)
- **Description**: Get all departments for a company
- **Success Response**:
  ```json
  [
    {
      "id": 1,
      "name": "Department Name",
      "hod": {
        "id": 1,
        "name": "HOD Name"
      },
      "employeesCount": 10,
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-02T00:00:00Z"
    }
  ]
  ```

### Get Department by ID

- **URL**: `/departments/{id}`
- **Method**: `GET`
- **Auth required**: Yes (company member)
- **Description**: Get details of a specific department
- **Success Response**:
  ```json
  {
    "id": 1,
    "name": "Department Name",
    "hod": {
      "id": 1,
      "name": "HOD Name",
      "email": "hod@example.com"
    },
    "company": {
      "id": 1,
      "name": "Company Name"
    },
    "employees": [
      {
        "id": 1,
        "name": "Employee Name",
        "designation": "Job Title"
      }
    ],
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
  ```

### Update Department

- **URL**: `/departments/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (company_admin)
- **Description**: Update department details including assigning a HOD
- **Request Body**:
  ```json
  {
    "name": "Updated Department Name",
    "hodId": 1  // Assign or update HOD
  }
  ```
- **Success Response**: Updated department object

### Delete Department

- **URL**: `/departments/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (company_admin)
- **Description**: Delete a department
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Department deleted successfully"
  }
  ```

## Event Management

### Create Event

- **URL**: `/api/events`
- **Method**: `POST`
- **Auth required**: Yes (company_admin or HOD)
- **Description**: Create a new event with optional tasks
- **Request Body**: Multipart Form Data
  ```json
  {
    "name": "Event Name",
    "description": "Event Description",
    "departmentId": 1,
    "priority": "high",
    "eventType": "webinar",
    "document": File (optional),
    "employees": [1, 2, 3],
    "tasks": [
      {
        "name": "Task 1",
        "description": "Description of Task 1",
        "status": "not_started"
      },
      {
        "name": "Task 2",
        "description": "Description of Task 2"
      }
    ]
  }
  ```
- **Success Response**:
  ```json
  {
    "id": 1,
    "name": "Event Name",
    "description": "Event Description",
    "priority": "high",
    "eventType": "webinar",
    "department": {
      "id": 1,
      "name": "Department Name"
    },
    "hod": {
      "id": 1,
      "name": "HOD Name"
    },
    "documents": [
      {
        "id": 1,
        "name": "document.pdf",
        "url": "/uploads/document-filename.pdf"
      }
    ],
    "employees": [
      {
        "id": 1,
        "name": "Employee Name"
      }
    ],
    "tasks": [
      {
        "id": 1,
        "name": "Task 1",
        "description": "Description of Task 1",
        "status": "not_started"
      },
      {
        "id": 2,
        "name": "Task 2",
        "description": "Description of Task 2",
        "status": "not_started"
      }
    ],
    "status": "pending",
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```

### Get All Events

- **URL**: `/events`
- **Method**: `GET`
- **Auth required**: Yes (company member)
- **Description**: Get all events (with filtering)
- **Query Parameters**:
  - `departmentId`: Filter by department
  - `status`: Filter by status
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Success Response**:
  ```json
  {
    "totalItems": 30,
    "totalPages": 3,
    "currentPage": 1,
    "events": [
      {
        "id": 1,
        "name": "Event Name",
        "priority": "high",
        "eventType": "webinar",
        "department": {
          "id": 1,
          "name": "Department Name"
        },
        "status": "pending|approved|rejected",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

### Get Event by ID

- **URL**: `/events/{id}`
- **Method**: `GET`
- **Auth required**: Yes (company member)
- **Description**: Get details of a specific event
- **Success Response**: Full event object with details

### Update Event

- **URL**: `/events/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (event creator, company_admin or HOD)
- **Description**: Update event details
- **Request Body**: Same as create event
- **Success Response**: Updated event object

### Delete Event

- **URL**: `/events/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (event creator, company_admin or HOD)
- **Description**: Delete an event
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Event deleted successfully"
  }
  ```

### Submit Event for Approval

- **URL**: `/events/{id}/submit`
- **Method**: `POST`
- **Auth required**: Yes (event creator)
- **Description**: Submit an event for approval
- **Request Body**:
  ```json
  {
    "approverEmail": "approver@example.com"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Event submitted for approval",
    "status": "pending"
  }
  ```

### Approve/Reject Event

- **URL**: `/events/{id}/approve`
- **Method**: `POST`
- **Auth required**: Yes (approver, company_admin)
- **Description**: Approve or reject an event
- **Request Body**:
  ```json
  {
    "approved": true,
    "comments": "Approval comments (optional)"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Event approved/rejected",
    "status": "approved|rejected"
  }
  ```

## RACI Matrix Management

### Create RACI Matrix

- **URL**: `/api/raci`
- **Method**: `POST`
- **Auth required**: Yes (company_admin or hod)
- **Description**: Create a RACI matrix using existing event tasks with hierarchy levels
- **Request Body**:
  ```json
  {
    "eventId": 1,
    "taskAssignments": [
      {
        "taskId": 1,
        "responsible": [1, 2],
        "accountable": [3],
        "consulted": [4, 5],
        "informed": [6, 7],
        "financialLimits": {
          "task-1-responsible-1": { "min": 1000, "max": 5000 },
          "task-1-responsible-2": { "min": 500, "max": 2000 },
          "task-1-accountable-3": { "min": 5000, "max": 10000 },
          "task-1-consulted-4": { "min": 0, "max": 3000 },
          "task-1-consulted-5": { "min": 200, "max": 1500 },
          "task-1-informed-6": { "min": 0, "max": 500 },
          "task-1-informed-7": { "min": 100, "max": 800 }
        },
        "levels": {
          "task-1-responsible-1": 1,
          "task-1-responsible-2": 2,
          "task-1-accountable-3": 1,
          "task-1-consulted-4": 1,
          "task-1-consulted-5": 2,
          "task-1-informed-6": 3,
          "task-1-informed-7": 3
        }
      }
    ]
  }
  ```
- **Note on Financial Limits**:
  Financial limits can be set for all RACI roles: Responsible (R), Accountable (A), Consulted (C), and Informed (I) users. The key format is:
  `task-{taskId}-{role}-{userId}` where:
  - `taskId` is the task identifier
  - `role` is one of "responsible", "accountable", "consulted", or "informed"
  - `userId` is the user identifier
  
  Each financial limit object should contain `min` and/or `max` values representing currency amounts.

- **Note on Hierarchy Levels**:
  Levels can be set for all RACI assignments to create hierarchical structures. The key format is:
  `task-{taskId}-{role}-{userId}` where:
  - `taskId` is the task identifier
  - `role` is one of "responsible", "accountable", "consulted", or "informed"
  - `userId` is the user identifier
  
  Each level should be an integer (1, 2, 3, etc.) where:
  - Level 1 represents the highest/primary level
  - Level 2 represents the secondary level
  - Level 3+ represents subsequent levels in the hierarchy
  
  This allows for multiple employees at different levels within the same RACI role, forming a hierarchical structure for single or groups of employees.
  
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "RACI matrix created successfully"
  }
  ```

### Get RACI Matrix by Event

- **URL**: `/api/raci/events/:eventId`
- **Method**: `GET`
- **Auth required**: Yes (company member)
- **Description**: Get RACI matrix details for a specific event
- **Success Response**:
  ```json
  {
    "eventId": 1,
    "name": "Event Name",
    "department": {
      "id": 1,
      "name": "Department Name"
    },
    "tasks": [
      {
        "id": 1,
        "name": "Task Name",
        "description": "Task Description",
        "status": "not_started",
        "raci": {
          "responsible": [
            {
              "id": 1,
              "name": "John Doe",
              "email": "john@example.com",
              "role": "user",
              "designation": "Developer",
              "level": 1,
              "financialLimits": {
                "min": 1000,
                "max": 5000
              }
            },
            {
              "id": 2,
              "name": "Jane Smith",
              "email": "jane@example.com",
              "role": "user",
              "designation": "Senior Developer",
              "level": 2,
              "financialLimits": {
                "min": 500,
                "max": 2000
              }
            }
          ],
          "accountable": [
            {
              "id": 3,
              "name": "Bob Johnson",
              "email": "bob@example.com",
              "role": "hod",
              "designation": "Team Lead",
              "level": 1,
              "financialLimits": {
                "min": 5000,
                "max": 10000
              }
            }
          ],
          "consulted": [],
          "informed": []
        }
      }
    ],
    "hasApprovals": true,
    "approvalStatus": {
      "overall": "PENDING",
      "total": 6,
      "approved": 3,
      "rejected": 0,
      "pending": 3
    },
    "approvalSummary": [
      {
        "approval_level": 1,
        "status": "APPROVED",
        "count": "3",
        "approver_name": "Jane Smith",
        "approver_email": "jane@example.com",
        "last_updated": "2023-07-20T14:30:00.000Z",
        "reason": "Looks good to proceed"
      },
      {
        "approval_level": 2,
        "status": "PENDING",
        "count": "3",
        "approver_name": "Bob Johnson",
        "approver_email": "bob@example.com",
        "last_updated": "2023-07-20T10:00:00.000Z",
        "reason": null
      }
    ]
  }
  ```

### Update RACI Matrix

- **URL**: `/api/raci/:eventId`
- **Method**: `PUT`
- **Auth required**: Yes (matrix creator, company_admin)
- **Description**: Update RACI matrix details for an existing event with hierarchy levels
- **Request Body**: Same format as Create RACI Matrix (including levels parameter)
- **Note on Financial Limits**: Same as Create RACI Matrix
- **Note on Hierarchy Levels**: Same as Create RACI Matrix

### Delete RACI Matrix

- **URL**: `/api/raci/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (matrix creator, company_admin)
- **Description**: Delete a RACI matrix
- **Status**: Not yet implemented

## RACI Approval Management

### Create RACI Approval Requests

- **URL**: `/api/raci/{eventId}/approvals`
- **Method**: `POST`
- **Auth required**: Yes (company_admin or hod)
- **Description**: Create approval requests for a RACI matrix. Choose two people for approval (can be normal users or HOD) based on level.
- **Request Body**:
  ```json
  {
    "approvers": [
      {
        "userId": 5,
        "approvalLevel": 1
      },
      {
        "userId": 8,
        "approvalLevel": 2
      }
    ]
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "RACI approval requests created successfully",
    "eventId": 1,
    "approvalsCreated": 12
  }
  ```

### Get Pending RACI Approvals

- **URL**: `/api/raci/approvals/pending`
- **Method**: `GET`
- **Auth required**: Yes
- **Description**: Get all pending RACI approvals for the current user
- **Success Response**:
  ```json
  {
    "success": true,
    "pendingApprovals": [
      {
        "eventId": 1,
        "eventName": "Project Alpha Launch",
        "eventDescription": "Launch of Project Alpha",
        "departmentName": "Engineering",
        "approvals": [
          {
            "approvalId": 15,
            "approvalLevel": 1,
            "status": "pending",
            "createdAt": "2023-07-20T10:00:00.000Z",
            "taskName": "Code Review",
            "taskDescription": "Review code changes",
            "assignedUserName": "John Doe",
            "raciType": "R",
            "raciLevel": 1
          }
        ]
      }
    ]
  }
  ```

### Get My RACI Approval History

- **URL**: `/api/raci/approvals/my-history`
- **Method**: `GET`
- **Auth required**: Yes (hod, user with approval permissions)
- **Description**: Get approval history for the current user - shows all past approval decisions (approved/rejected)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `pageSize`: Items per page (default: 10)
- **Success Response**:
  ```json
  {
    "success": true,
    "totalItems": 25,
    "totalPages": 3,
    "currentPage": 1,
    "summary": {
      "totalDecisions": 25,
      "approved": 20,
      "rejected": 5
    },
    "approvalHistory": [
      {
        "eventId": 1,
        "eventName": "Project Alpha Launch",
        "eventDescription": "Launch of Project Alpha",
        "eventStatus": "approved",
        "department": {
          "id": 1,
          "name": "Engineering"
        },
        "company": {
          "id": 1,
          "name": "ACME Corporation"
        },
        "approvals": [
          {
            "approvalId": 15,
            "approvalLevel": 1,
            "status": "APPROVED",
            "reason": "Looks good to proceed",
            "approvedAt": "2023-07-20T14:30:00.000Z",
            "createdAt": "2023-07-20T10:00:00.000Z",
            "updatedAt": "2023-07-20T14:30:00.000Z",
            "raciAssignment": {
              "id": 45,
              "type": "R",
              "level": 1,
              "financialLimits": {
                "min": 1000,
                "max": 5000
              }
            },
            "task": {
              "id": 12,
              "name": "Code Review",
              "description": "Review code changes",
              "status": "not_started"
            },
            "assignedUser": {
              "id": 101,
              "name": "John Doe",
              "email": "john@example.com",
              "role": "user",
              "designation": "Senior Developer",
              "phone": "+1234567890",
              "employeeId": "ENG-001"
            }
          }
        ]
      },
      {
        "eventId": 2,
        "eventName": "Product Beta Testing",
        "eventDescription": "Beta testing phase",
        "eventStatus": "approved",
        "department": {
          "id": 2,
          "name": "QA"
        },
        "company": {
          "id": 1,
          "name": "ACME Corporation"
        },
        "approvals": [
          {
            "approvalId": 25,
            "approvalLevel": 2,
            "status": "REJECTED",
            "reason": "Budget allocation needs revision",
            "approvedAt": "2023-07-19T16:45:00.000Z",
            "createdAt": "2023-07-19T12:00:00.000Z",
            "updatedAt": "2023-07-19T16:45:00.000Z",
            "raciAssignment": {
              "id": 67,
              "type": "A",
              "level": 1,
              "financialLimits": {
                "min": 5000,
                "max": 15000
              }
            },
            "task": {
              "id": 18,
              "name": "Budget Approval",
              "description": "Approve testing budget",
              "status": "not_started"
            },
            "assignedUser": {
              "id": 102,
              "name": "Jane Smith",
              "email": "jane@example.com",
              "role": "hod",
              "designation": "QA Manager",
              "phone": "+1234567891",
              "employeeId": "QA-001"
            }
          }
        ]
      }
    ],
    "message": "Retrieved 2 events with approval history"
  }
  ```
- **Empty Response** (when no history exists):
  ```json
  {
    "success": true,
    "message": "No approval history found",
    "totalItems": 0,
    "totalPages": 0,
    "currentPage": 1,
    "approvalHistory": []
  }
  ```

### Get RACI Matrix for Approval (Read-Only View)

- **URL**: `/api/raci/{eventId}/approval-view`
- **Method**: `GET`
- **Auth required**: Yes
- **Description**: Get read-only view of RACI matrix for approval. User must have pending approvals for this event.
- **Success Response**:
  ```json
  {
    "eventId": 1,
    "name": "Project Alpha Launch",
    "description": "Launch of Project Alpha",
    "department": {
      "id": 1,
      "name": "Engineering"
    },
    "tasks": [
      {
        "id": 1,
        "name": "Code Review",
        "description": "Review code changes",
        "status": "not_started",
        "raci": {
          "responsible": [
            {
              "id": 1,
              "name": "John Doe",
              "email": "john@example.com",
              "role": "user",
              "designation": "Developer",
              "level": 1,
              "financialLimits": {
                "min": 1000,
                "max": 5000
              }
            }
          ],
          "accountable": [],
          "consulted": [],
          "informed": []
        }
      }
    ],
    "approvalSummary": [
      {
        "approval_level": 1,
        "count": "6"
      }
    ],
    "isReadOnly": true
  }
  ```

### Approve/Reject RACI Matrix

- **URL**: `/api/raci/{eventId}/approve`
- **Method**: `POST`
- **Auth required**: Yes
- **Description**: Approve or reject RACI matrix. For approve, reason is optional. For reject, reason is compulsory.
- **Request Body for Approval**:
  ```json
  {
    "action": "approve",
    "reason": "Looks good to proceed" // Optional for approve
  }
  ```
- **Request Body for Rejection**:
  ```json
  {
    "action": "reject",
    "reason": "Budget allocation needs revision" // Required for reject
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "RACI matrix approved successfully",
    "action": "approved",
    "eventId": 1,
    "approvalsUpdated": 6
  }
  ```

### Get RACI Approval Status

- **URL**: `/api/raci/{eventId}/approval-status`
- **Method**: `GET`
- **Auth required**: Yes
- **Description**: Get approval status summary for a RACI matrix
- **Success Response**:
  ```json
  {
    "eventId": 1,
    "eventName": "Project Alpha Launch",
    "overallStatus": "pending",
    "summary": {
      "total": 12,
      "approved": 6,
      "rejected": 0,
      "pending": 6
    },
    "approvalsByLevel": [
      {
        "approval_level": 1,
        "status": "approved",
        "count": "6",
        "approver_name": "Jane Smith",
        "approver_email": "jane@example.com"
      },
      {
        "approval_level": 2,
        "status": "pending",
        "count": "6",
        "approver_name": "Bob Johnson",
        "approver_email": "bob@example.com"
      }
    ],
    "detailedApprovals": [
      {
        "approval_id": 15,
        "approval_level": 1,
        "status": "approved",
        "reason": "Looks good",
        "approved_at": "2023-07-20T14:30:00.000Z",
        "approver_name": "Jane Smith",
        "approver_email": "jane@example.com"
      }
    ]
  }
  ```

### Get Eligible Approvers

- **URL**: `/api/raci/eligible-approvers`
- **Method**: `GET`
- **Auth required**: Yes (company_admin or hod)
- **Query Parameters**:
  - `level`: Optional level filter
- **Description**: Get users eligible for RACI approval based on their approval_assign flag and level
- **Success Response**:
  ```json
  {
    "success": true,
    "eligibleApprovers": [
      {
        "id": 5,
        "name": "Jane Smith",
        "email": "jane@example.com",
        "role": "hod",
        "designation": "Department Head",
        "department": "Engineering"
      },
      {
        "id": 8,
        "name": "Bob Johnson",
        "email": "bob@example.com",
        "role": "user",
        "designation": "Senior Manager",
        "department": "Engineering"
      }
    ]
  }
  ```

## Meeting Management

> ✅ **Company Filtering Implemented**: Meeting endpoints now use intelligent company-based access control. Users can only see meetings from their company, meetings where they are guests, or meetings they created.

### Current Implementation Status
- ✅ **Working**: Create, read, update, delete meetings
- ✅ **Working**: Calendar view with date filtering  
- ✅ **Working**: Guest user associations
- ✅ **Implemented**: Company-based access control via event filtering
- ✅ **Security**: Proper authorization checks for all operations
- ✅ **Optimized**: Clean company filtering logic using event-based approach

### Access Control Rules
Users can access meetings if any of these conditions are met:
1. **Company Events**: Meeting belongs to an event that is assigned to a department in the user's company
2. **Guest Access**: User is listed as a guest in the meeting (`guest_user_ids`)

**Company Filtering Logic:**
- System first finds all events belonging to departments in the user's company
- Then shows only meetings that are linked to those events OR where the user is a guest
- This ensures clean company-based data separation

### Create Meeting

- **URL**: `/api/meetings`
- **Method**: `POST`
- **Auth required**: Yes (company member)
- **Description**: Create a new meeting for an event
- **Request Body**:
  ```json
  {
    "eventId": 1,
    "title": "Project Planning Meeting",
    "description": "Discussion about project milestones",
    "meetingDate": "2023-07-25T14:00:00.000Z",
    "guestUserIds": [5, 8, 12], // Can also be comma-separated string
    "meetingUrl": "https://zoom.us/j/123456789"
  }
  ```
- **Success Response**:
  ```json
  {
    "id": 10,
    "title": "Project Planning Meeting",
    "description": "Discussion about project milestones",
    "meetingDate": "2023-07-25T14:00:00.000Z",
    "meetingUrl": "https://zoom.us/j/123456789",
    "event": {
      "id": 1,
      "name": "Project Alpha Launch"
    },
    "guests": [
      {
        "id": 5,
        "name": "Jane Smith"
      },
      {
        "id": 8,
        "name": "Bob Johnson"
      }
    ],
    "createdAt": "2023-07-20T10:00:00.000Z"
  }
  ```

### Get All Meetings

- **URL**: `/api/meetings`
- **Method**: `GET`
- **Auth required**: Yes (authenticated user)
- **Query Parameters**:
  - `eventId`: Filter by event ID
  - `startDate`: Filter meetings from this date
  - `endDate`: Filter meetings until this date
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Description**: Get meetings accessible to the current user based on company association, guest status, or admin privileges
- **Access Control**: Returns only meetings that the user has permission to view according to company filtering rules
- **Success Response**:
  ```json
  {
    "success": true,
    "totalItems": 25,
    "totalPages": 3,
    "currentPage": 1,
    "meetings": [
      {
        "id": 10,
        "title": "Project Planning Meeting",
        "description": "Discussion about project milestones",
        "meetingDate": "2023-07-25T14:00:00.000Z",
        "meetingUrl": "https://zoom.us/j/123456789",
        "event": {
          "id": 1,
          "name": "Project Alpha Launch"
        },
        "department": {
          "name": "Engineering"
        },
        "guests": [
          {
            "id": 5,
            "name": "Jane Smith"
          }
        ]
      }
    ],
    "message": "Retrieved 25 meetings"
  }
  ```

### Get Meeting by ID

- **URL**: `/api/meetings/{id}`
- **Method**: `GET`
- **Auth required**: Yes (authenticated user)
- **Description**: Get detailed information about a specific meeting (if user has access)
- **Access Control**: Returns meeting details only if the user has permission to view the meeting according to company filtering rules
- **Success Response**:
  ```json
  {
    "id": 10,
    "title": "Project Planning Meeting",
    "description": "Discussion about project milestones",
    "meetingDate": "2023-07-25T14:00:00.000Z",
    "meetingUrl": "https://zoom.us/j/123456789",
    "event": {
      "id": 1,
      "name": "Project Alpha Launch"
    },
    "department": {
      "name": "Engineering"
    },
    "guests": [
      {
        "id": 5,
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    ],
    "createdAt": "2023-07-20T10:00:00.000Z",
    "updatedAt": "2023-07-20T10:00:00.000Z"
  }
  ```

### Update Meeting

- **URL**: `/api/meetings/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (meeting creator, company_admin or HOD)
- **Description**: Update meeting details (if user has access)
- **Access Control**: Can only update meetings that the user has permission to modify
- **Request Body**: Same as create meeting (all fields optional)
- **Success Response**: Updated meeting object

### Delete Meeting

- **URL**: `/api/meetings/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (meeting creator, company_admin or HOD)
- **Description**: Delete a meeting (if user has access)
- **Access Control**: Can only delete meetings that the user has permission to modify
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Meeting deleted successfully"
  }
  ```



### Get Meetings by Date Range (Calendar View)

- **URL**: `/api/meetings/calendar`
- **Method**: `GET`
- **Auth required**: Yes (authenticated user)
- **Query Parameters**:
  - `startDate`: Start date for date range (required if `date` not provided)
  - `endDate`: End date for date range (required if `date` not provided)
  - `date`: Single date for daily view (required if `startDate` and `endDate` not provided)
- **Description**: Get meetings within a date range or for a specific date for calendar display, filtered by user access permissions
- **Access Control**: Returns only meetings within the date range that the user has permission to view according to company filtering rules
- **Success Response**:
      ```json
    {
      "success": true,
      "calendarEvents": [
        {
          "id": 5,
          "title": "esrdtfyguhfytf",
          "description": "r76r76r76r",
          "meetingDate": "2025-06-29T13:08:00.000Z",
          "start": "2025-06-29T13:08:00.000Z",
          "meetingUrl": "https://meet.google.com/wje-yjnp-nww",
          "event": {
            "id": 83,
            "name": "Event Name",
            "description": "Event Description"
          },
          "department": {
            "id": 1,
            "name": "Engineering"
          },
          "guests": [
            {
              "id": 81,
              "name": "User Name",
              "email": "user@example.com"
            }
          ],
          "createdAt": "2025-06-29T13:08:26.730Z",
          "updatedAt": "2025-06-29T13:08:26.730Z"
        }
      ],
      "meetings": [
        {
          "id": 5,
          "title": "esrdtfyguhfytf",
          "description": "r76r76r76r",
          "meetingDate": "2025-06-29T13:08:00.000Z",
          "start": "2025-06-29T13:08:00.000Z",
          "meetingUrl": "https://meet.google.com/wje-yjnp-nww",
          "event": {
            "id": 83,
            "name": "Event Name",
            "description": "Event Description"
          },
          "department": {
            "id": 1,
            "name": "Engineering"
          },
          "guests": [
            {
              "id": 81,
              "name": "User Name",
              "email": "user@example.com"
            }
          ],
          "createdAt": "2025-06-29T13:08:26.730Z",
          "updatedAt": "2025-06-29T13:08:26.730Z"
        }
      ],
      "totalItems": 1,
      "dateRange": {
        "start": "2025-06-29T00:00:00.000Z",
        "end": "2025-06-30T00:00:00.000Z"
      }
    }
    ```

## User RACI Assignments

### Get My RACI Assignments

- **URL**: `/api/user-raci/my-assignments`
- **Method**: `GET`
- **Auth required**: Yes (JWT Token in Authorization header)
- **Description**: Retrieves all RACI assignments for the currently authenticated user, including their department and event information.

#### Success Response:

- **Code**: 200 OK
- **Content example**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "609c2319b4d42d1b8c7b6d9a",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "department": {
      "id": "609c2319b4d42d1b8c7b6d8b",
      "name": "Engineering"
    },
    "raciAssignments": [
      {
        "id": 1,
        "type": "R",
        "level": 1,
        "financialLimits": {
          "min": 1000,
          "max": 5000
        },
        "task": {
          "id": "609c2319b4d42d1b8c7b6d7c",
          "name": "Code Review",
          "description": "Review code changes"
        },
        "event": {
          "id": "609c2319b4d42d1b8c7b6d6d",
          "name": "Product Release v1.0",
          "startDate": "2023-06-01T00:00:00.000Z",
          "endDate": "2023-06-15T00:00:00.000Z"
        }
      }
    ]
  }
}
```

#### Error Response:

- **Code**: 500 Internal Server Error
- **Content example**:

```json
{
  "success": false,
  "message": "Failed to retrieve RACI assignments",
  "error": "Error message details"
}
```

---

## RACI Tracker

### Get Company RACI Assignments

- **URL**: `/api/raci-tracker/company`
- **Method**: `GET`
- **Auth required**: Yes (company_admin only)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `pageSize`: Number of items per page (default: 10)
- **Description**: Get all RACI assignments for the company of the authenticated company admin. This is the unified endpoint for accessing all RACI data.
- **Success Response**:
  ```json
  {
    "success": true,
    "totalItems": 25,
    "totalPages": 3,
    "currentPage": 1,
    "data": [
      {
        "id": 1,
        "user": {
          "id": 12,
          "name": "Alice Smith",
          "email": "alice@company.com",
          "role": "user"
        },
        "type": "R",
        "level": 1,
        "financialLimits": { "min": 1000, "max": 5000 },
        "task": {
          "id": 10,
          "name": "Approve Budget",
          "description": "Approve the department budget"
        },
        "event": {
          "id": 5,
          "name": "Annual Planning",
          "status": "approved",
          "startDate": "2024-06-01T00:00:00.000Z",
          "endDate": "2024-06-10T00:00:00.000Z"
        },
        "department": {
          "id": 2,
          "name": "Finance"
        }
      }
      // ...more assignments for all users in the company
    ]
  }
  ```
- **Note**: This endpoint is accessible only to company_admin users and returns all RACI assignments for all users in their company.

- **Empty Response**:
  ```json
  {
    "success": true,
    "message": "No RACI assignments found for this company",
    "totalItems": 0,
    "totalPages": 0,
    "currentPage": 1,
    "data": []
  }
  ```

## RACI Tracker

### Get My RACI Assignments

- **URL**: `/api/raci-tracker/my-assignments`
- **Method**: `GET`
- **Auth required**: Yes (any authenticated user, including company_admin)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `pageSize`: Number of items per page (default: 10)
- **Description**: Get all RACI assignments for the currently authenticated user (works for company_admin, hod, and user roles), including financial limits, task, event, and department details.
- **Success Response**:
  ```json
  {
    "success": true,
    "totalItems": 20,
    "totalPages": 2,
    "currentPage": 1,
    "data": [
      {
        "id": 1,
        "type": "R",
        "level": 1,
        "financialLimits": { "min": 1000, "max": 5000 },
        "task": {
          "id": 10,
          "name": "Approve Budget",
          "description": "Approve the department budget"
        },
        "event": {
          "id": 5,
          "name": "Annual Planning",
          "startDate": "2024-06-01T00:00:00.000Z",
          "endDate": "2024-06-10T00:00:00.000Z"
        },
        "department": {
          "id": 2,
          "name": "Finance"
        }
      }
    ]
  }
  ```
- **IMPORTANT NOTE**: The correct endpoint is `/api/raci-tracker/my-assignments`. The previous endpoint `/api/raci/tracker` is deprecated but will redirect to the correct endpoint for backward compatibility.
- **Empty Response**: If no assignments are found, the endpoint returns an empty data array:
  ```json
  {
    "success": true,
    "totalItems": 0,
    "totalPages": 0,
    "currentPage": 1,
    "data": []
  }
  ```

## HOD Department Management

### Get Comprehensive Department Details

- **URL**: `/api/hod/department-details`
- **Method**: `GET`
- **Auth required**: Yes (JWT Token in Authorization header, must be HOD role)
- **Description**: Retrieves comprehensive details about the department the HOD is managing, including employees, events, and RACI assignments.

#### Success Response:

- **Code**: 200 OK
- **Content example**:

```json
{
  "success": true,
  "department": {
    "id": 1,
    "name": "Engineering",
    "company": {
      "id": 1,
      "name": "ACME Corporation"
    },
    "createdAt": "2023-06-01T00:00:00.000Z"
  },
  "statistics": {
    "totalEmployees": 15,
    "totalEvents": 8,
    "pendingApprovals": 3,
    "raciDistribution": {
      "R": { "usersCount": 10, "tasksCount": 12 },
      "A": { "usersCount": 5, "tasksCount": 8 },
      "C": { "usersCount": 12, "tasksCount": 8 },
      "I": { "usersCount": 15, "tasksCount": 8 }
    }
  },
  "employees": [
    {
      "id": 101,
      "name": "John Doe",
      "email": "john@example.com",
      "designation": "Senior Developer",
      "role": "user",
      "phone": "+1234567890",
      "employeeId": "ENG-001"
    }
  ],
  "events": [
    {
      "id": 1,
      "name": "Project Alpha Launch",
      "description": "Launch of Project Alpha",
      "status": "approved",
      "createdBy": "Jane Smith",
      "createdAt": "2023-07-15T10:00:00.000Z"
    }
  ],
  "pendingApprovals": [
    {
      "id": 2,
      "name": "Project Beta Planning",
      "createdBy": "Bob Johnson",
      "createdAt": "2023-07-18T09:30:00.000Z"
    }
  ],
  "raciByEvent": [
    {
      "id": 1,
      "name": "Project Alpha Launch",
      "tasks": [
        {
          "id": 1,
          "name": "Code Review",
          "description": "Review code changes",
          "responsible": [
            {
              "id": 101,
              "name": "John Doe",
              "email": "john@example.com",
              "designation": "Senior Developer",
              "level": 1,
              "financialLimits": {
                "min": 1000,
                "max": 5000
              }
            }
          ],
          "accountable": [
            {
              "id": 102,
              "name": "Jane Smith",
              "email": "jane@example.com",
              "designation": "Team Lead",
              "level": 1,
              "financialLimits": null
            }
          ],
          "consulted": [],
          "informed": []
        }
      ]
    }
  ]
}
```

#### Error Response:

- **Code**: 403 Forbidden
- **Content example**:

```json
{
  "success": false,
  "message": "Access denied. Only department heads can access this resource"
}
```

OR

- **Code**: 404 Not Found
- **Content example**:

```json
{
  "success": false,
  "message": "No departments found where you are the HOD"
}
```

## Meeting Management

> Note: The following Meeting endpoints are currently not implemented in the API and will return a 501 Not Implemented status.

### Create Meeting

- **URL**: `/meetings`
- **Method**: `POST`
- **Auth required**: Yes (company member)
- **Description**: Create a new meeting
- **Status**: Not yet implemented

### Get All Meetings

- **URL**: `/meetings`
- **Method**: `GET`
- **Auth required**: Yes (company member)
- **Description**: Get all meetings (with filtering)
- **Status**: Not yet implemented

### Get Meeting by ID

- **URL**: `/meetings/{id}`
- **Method**: `GET`
- **Auth required**: Yes (company member)
- **Description**: Get details of a specific meeting
- **Status**: Not yet implemented

### Update Meeting

- **URL**: `/meetings/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (meeting organizer, company_admin)
- **Description**: Update meeting details
- **Status**: Not yet implemented

### Delete Meeting

- **URL**: `/meetings/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (meeting organizer, company_admin)
- **Description**: Delete a meeting
- **Status**: Not yet implemented

## Reference Data Management

The following reference tables are used to populate dropdown options in the user creation form within the company admin interface. These are pure reference data tables with no foreign key relationships to other entities.

### Designations Reference Table

Used to populate the designation dropdown in the user creation form.

#### Get All Designations

- **URL**: `/api/designations`
- **Method**: `GET`
- **Auth required**: Yes (company_admin)
- **Description**: Get all available designations for dropdown selection
- **Success Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "Software Engineer",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "name": "Project Manager",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:00:00Z"
      },
      {
        "id": 3,
        "name": "Team Lead",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

#### Create Designation

- **URL**: `/api/designations`
- **Method**: `POST`
- **Auth required**: Yes (company_admin)
- **Description**: Create a new designation
- **Request Body**:
  ```json
  {
    "name": "Senior Software Engineer"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": 4,
      "name": "Senior Software Engineer",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  }
  ```

#### Update Designation

- **URL**: `/api/designations/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (company_admin)
- **Description**: Update an existing designation
- **Request Body**:
  ```json
  {
    "name": "Senior Software Developer"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": 4,
      "name": "Senior Software Developer",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  }
  ```

#### Delete Designation

- **URL**: `/api/designations/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (company_admin)
- **Description**: Delete a designation
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Designation deleted successfully"
  }
  ```

### Locations Reference Table

Used to populate the location dropdown in the user creation form.

#### Get All Locations

- **URL**: `/api/locations`
- **Method**: `GET`
- **Auth required**: Yes (company_admin)
- **Description**: Get all available locations for dropdown selection
- **Success Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "New York, USA",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "name": "London, UK",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:00:00Z"
      },
      {
        "id": 3,
        "name": "Mumbai, India",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

#### Create Location

- **URL**: `/api/locations`
- **Method**: `POST`
- **Auth required**: Yes (company_admin)
- **Description**: Create a new location
- **Request Body**:
  ```json
  {
    "name": "Toronto, Canada"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": 4,
      "name": "Toronto, Canada",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  }
  ```

#### Update Location

- **URL**: `/api/locations/{id}`
- **Method**: `PUT`
- **Auth required**: Yes (company_admin)
- **Description**: Update an existing location
- **Request Body**:
  ```json
  {
    "name": "Toronto, ON, Canada"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": 4,
      "name": "Toronto, ON, Canada",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  }
  ```

#### Delete Location

- **URL**: `/api/locations/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (company_admin)
- **Description**: Delete a location
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Location deleted successfully"
  }
  ```

### Frontend Implementation Notes

**For User Creation Form:**
1. **Designation Dropdown**: Fetch designations from `/api/designations` and populate dropdown with `name` values
2. **Location Dropdown**: Fetch locations from `/api/locations` and populate dropdown with `name` values
3. **Usage**: When creating a user, send the selected designation and location names as strings (not IDs) in the user creation request
4. **Management**: Company admins can manage both designations and locations through separate management interfaces

**Example User Creation with Reference Data:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "designation": "Senior Software Engineer",  // from designations table
  "location": "New York, USA",               // from locations table
  "role": "user",
  "departmentId": 1
}
```

**Note**: These are pure reference tables with no foreign key relationships. The designation and location fields in the users table remain as text fields, but the values are populated from these reference tables to ensure consistency across the application.

## Dashboard & Analytics

> Note: The following Dashboard endpoints are currently not implemented in the API and will return a 501 Not Implemented status.

### Get Website Admin Dashboard Stats

- **URL**: `/dashboard/website-admin`
- **Method**: `GET`
- **Auth required**: Yes (website_admin)
- **Description**: Get statistics for website admin dashboard
- **Status**: Not yet implemented

### Get Company Admin Dashboard Stats

- **URL**: `/dashboard/company-admin`
- **Method**: `GET`
- **Auth required**: Yes (company_admin)
- **Description**: Get statistics and company details for company admin dashboard
- **Success Response**:
  ```json
  {
    "company": {
      "id": 1,
      "name": "Company Name",
      "logoUrl": "/uploads/logo-filename.png",
      "domain": "example.com",
      "industry": "Technology",
      "size": "100-500",
      "panId": "AAAPL1234C",
      "projectName": "RACI Platform",
      "projectLogo": "/uploads/project-logo.png",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-02T00:00:00Z"
    },
    "stats": {
      "users": {
        "total": 15,
        "company_admin": 2,
        "hod": 3,
        "user": 10
      },
      "departments": 5,
      "events": {
        "total": 25,
        "pending": 5,
        "approved": 15,
        "rejected": 5
      }
    },
    "recentEvents": [
      {
        "id": 1,
        "name": "Event Name",
        "department": "Department Name",
        "status": "pending",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

### Get HOD Dashboard Stats

- **URL**: `/dashboard/hod`
- **Method**: `GET`
- **Auth required**: Yes (hod)
- **Description**: Get statistics for department head dashboard
- **Success Response**:
  ```json
  {
    "department": {
      "id": 1,
      "name": "Department Name",
      "company": {
        "id": 1,
        "name": "Company Name"
      }
    },
    "stats": {
      "users": 10,
      "events": {
        "total": 20,
        "pending": 5,
        "approved": 10,
        "rejected": 5
      }
    },
    "recentEvents": [
      {
        "id": 1,
        "name": "Event Name",
        "createdBy": "User Name",
        "status": "pending",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ],
    "pendingApprovals": [
      {
        "id": 2,
        "name": "Event Name",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

### Get User Dashboard Stats

- **URL**: `/dashboard/user`
- **Method**: `GET`
- **Auth required**: Yes (any user)
- **Description**: Get statistics for user dashboard
- **Success Response**:
  ```json
  {
    "stats": {
      "events": {
        "total": 10,
        "pending": 3,
        "approved": 5,
        "rejected": 2
      }
    },
    "recentEvents": [
      {
        "id": 1,
        "name": "Event Name",
        "department": "Department Name",
        "status": "approved",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```
    "stats": {
      "events": {
        "total": 10,
        "pending": 3,
        "approved": 5,
        "rejected": 2
      }
    },
    "recentEvents": [
      {
        "id": 1,
        "name": "Event Name",
        "department": "Department Name",
        "status": "approved",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```
