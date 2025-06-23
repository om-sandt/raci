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
- **Success Response**:
  ```json
  {
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "user": {
      "id": 1,
      "name": "Om Vataliya",
      "email": "omvataliya23@gmail.com",
      "role": "website_admin",
      "phone": "6351497589"
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
- **Auth required**: Yes (website_admin)
- **Description**: Create a new website admin
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
      "created_at": "2023-07-21T12:00:00Z"
    }
  }
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
- **Error Response** (when trying to delete last admin):
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

- **URL**: `/api/raci-matrices`
- **Method**: `POST`
- **Auth required**: Yes (company_admin or hod)
- **Description**: Create a RACI matrix using existing event tasks
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
  
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "RACI matrix created successfully"
  }
  ```

### Update RACI Matrix

- **URL**: `/api/raci-matrices/:eventId`
- **Method**: `PUT`
- **Auth required**: Yes (matrix creator, company_admin)
- **Description**: Update RACI matrix details for an existing event
- **Request Body**: Same format as Create RACI Matrix
- **Note on Financial Limits**: Same as Create RACI Matrix

### Delete RACI Matrix

- **URL**: `/raci-matrices/{id}`
- **Method**: `DELETE`
- **Auth required**: Yes (matrix creator, company_admin)
- **Description**: Delete a RACI matrix
- **Status**: Not yet implemented

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
        "role": "R",
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
        "role": "R",
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
        "role": "R",
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
