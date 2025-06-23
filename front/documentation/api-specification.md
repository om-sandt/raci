# RACI SaaS Platform API Specification

This document provides a comprehensive list of all APIs required for the RACI SaaS platform, organized by functional area.

## Table of Contents
- [Authentication](#authentication)
- [User Management](#user-management)
- [Company Management](#company-management)
- [Department Management](#department-management)
- [Event Management](#event-management)
- [RACI Matrix Management](#raci-matrix-management)
- [Meeting Management](#meeting-management)
- [Dashboard & Analytics](#dashboard--analytics)

---

## Authentication

### Login
- **Method:** POST
- **Endpoint:** `/api/auth/login`
- **Description:** Authenticate a user and return tokens
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "user": {
      "id": "user-id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user|company-admin|website-admin",
      "company": {
        "id": "company-id",
        "name": "Company Name"
      }
    }
  }
  ```

### Refresh Token
- **Method:** POST
- **Endpoint:** `/api/auth/refresh-token`
- **Description:** Get a new access token using refresh token
- **Request Body:**
  ```json
  {
    "refreshToken": "refresh-token-here"
  }
  ```
- **Response:**
  ```json
  {
    "token": "new-jwt-token-here"
  }
  ```

### Get Current User
- **Method:** GET
- **Endpoint:** `/api/auth/me`
- **Description:** Get details of the currently authenticated user
- **Authorization:** Bearer Token
- **Response:**
  ```json
  {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user|company-admin|website-admin",
    "company": {
      "id": "company-id",
      "name": "Company Name"
    },
    "designation": "Job Title",
    "phone": "+1234567890",
    "employeeId": "EMP123"
  }
  ```

### Logout
- **Method:** POST
- **Endpoint:** `/api/auth/logout`
- **Description:** Invalidate the current token
- **Authorization:** Bearer Token
- **Response:**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

## User Management

### Create User
- **Method:** POST
- **Endpoint:** `/api/users`
- **Description:** Create a new user
- **Authorization:** Bearer Token (company-admin or website-admin)
- **Request Body:**
  ```json
  {
    "name": "New User",
    "email": "newuser@example.com",
    "role": "user|company-admin|hod",
    "designation": "Job Title",
    "phone": "+1234567890",
    "employeeId": "EMP123",
    "departmentId": "department-id",
    "companyId": "company-id"
  }
  ```
- **Response:**
  ```json
  {
    "id": "user-id",
    "name": "New User",
    "email": "newuser@example.com",
    "role": "user|company-admin|hod",
    "designation": "Job Title",
    "phone": "+1234567890",
    "employeeId": "EMP123",
    "department": {
      "id": "department-id",
      "name": "Department Name"
    },
    "company": {
      "id": "company-id",
      "name": "Company Name"
    },
    "status": "pending|active"
  }
  ```

### Get All Users
- **Method:** GET
- **Endpoint:** `/api/users`
- **Description:** Get all users (with filtering)
- **Authorization:** Bearer Token (company-admin or website-admin)
- **Query Parameters:**
  - `companyId`: Filter by company
  - `departmentId`: Filter by department
  - `role`: Filter by role
  - `status`: Filter by status (pending, active)
  - `page`: Page number
  - `limit`: Items per page
- **Response:**
  ```json
  {
    "totalItems": 50,
    "totalPages": 5,
    "currentPage": 1,
    "users": [
      {
        "id": "user-id",
        "name": "User Name",
        "email": "user@example.com",
        "role": "user|company-admin|hod",
        "designation": "Job Title",
        "department": {
          "id": "department-id",
          "name": "Department Name"
        },
        "status": "pending|active"
      }
    ]
  }
  ```

### Get User by ID
- **Method:** GET
- **Endpoint:** `/api/users/{id}`
- **Description:** Get details of a specific user
- **Authorization:** Bearer Token
- **Response:**
  ```json
  {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user|company-admin|hod",
    "designation": "Job Title",
    "phone": "+1234567890",
    "employeeId": "EMP123",
    "department": {
      "id": "department-id",
      "name": "Department Name"
    },
    "company": {
      "id": "company-id",
      "name": "Company Name"
    },
    "status": "pending|active"
  }
  ```

### Update User
- **Method:** PUT
- **Endpoint:** `/api/users/{id}`
- **Description:** Update user details
- **Authorization:** Bearer Token (self, company-admin or website-admin)
- **Request Body:**
  ```json
  {
    "name": "Updated Name",
    "designation": "Updated Title",
    "phone": "+1234567890",
    "departmentId": "department-id"
  }
  ```
- **Response:** Updated user object

### Change User Status
- **Method:** PATCH
- **Endpoint:** `/api/users/{id}/status`
- **Description:** Approve, reject or deactivate a user
- **Authorization:** Bearer Token (company-admin or website-admin)
- **Request Body:**
  ```json
  {
    "status": "active|rejected|inactive",
    "reason": "Reason for rejection or deactivation (optional)"
  }
  ```
- **Response:** Updated user object

### Delete User
- **Method:** DELETE
- **Endpoint:** `/api/users/{id}`
- **Description:** Delete a user
- **Authorization:** Bearer Token (company-admin or website-admin)
- **Response:**
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```

---

## Company Management

### Create Company
- **Method:** POST
- **Endpoint:** `/api/companies`
- **Description:** Create a new company
- **Authorization:** Bearer Token (website-admin)
- **Request Body:** Multipart Form Data
  - `name`: Company name
  - `logo`: Company logo (file upload)
  - `domain`: Company domain (optional)
  - `industry`: Industry type (optional)
  - `size`: Company size range (optional)
- **Response:**
  ```json
  {
    "id": "company-id",
    "name": "Company Name",
    "logoUrl": "https://example.com/logo.png",
    "domain": "example.com",
    "industry": "Technology",
    "size": "100-500",
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```

### Get All Companies
- **Method:** GET
- **Endpoint:** `/api/companies`
- **Description:** Get all companies
- **Authorization:** Bearer Token (website-admin)
- **Query Parameters:**
  - `page`: Page number
  - `limit`: Items per page
  - `search`: Search by name/domain
- **Response:**
  ```json
  {
    "totalItems": 20,
    "totalPages": 2,
    "currentPage": 1,
    "companies": [
      {
        "id": "company-id",
        "name": "Company Name",
        "logoUrl": "https://example.com/logo.png",
        "domain": "example.com",
        "adminsCount": 3,
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

### Get Company by ID
- **Method:** GET
- **Endpoint:** `/api/companies/{id}`
- **Description:** Get details of a specific company
- **Authorization:** Bearer Token (website-admin or company member)
- **Response:**
  ```json
  {
    "id": "company-id",
    "name": "Company Name",
    "logoUrl": "https://example.com/logo.png",
    "domain": "example.com",
    "industry": "Technology",
    "size": "100-500",
    "settings": {
      "approvalWorkflow": "sequential|parallel|any",
      "defaultApprover": "department-head|company-admin",
      "allowRejectionFeedback": true,
      "notifyOnApproval": true,
      "notifyOnRejection": true
    },
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
  ```

### Update Company
- **Method:** PUT
- **Endpoint:** `/api/companies/{id}`
- **Description:** Update company details
- **Authorization:** Bearer Token (website-admin or company-admin)
- **Request Body:** Multipart Form Data
  - `name`: Company name
  - `logo`: Company logo (file upload, optional)
  - `domain`: Company domain
  - `industry`: Industry type
  - `size`: Company size range
- **Response:** Updated company object

### Update Company Settings
- **Method:** PATCH
- **Endpoint:** `/api/companies/{id}/settings`
- **Description:** Update company settings
- **Authorization:** Bearer Token (company-admin)
- **Request Body:**
  ```json
  {
    "approvalWorkflow": "sequential|parallel|any",
    "defaultApprover": "department-head|company-admin",
    "allowRejectionFeedback": true,
    "notifyOnApproval": true,
    "notifyOnRejection": true
  }
  ```
- **Response:** Updated company object

### Delete Company
- **Method:** DELETE
- **Endpoint:** `/api/companies/{id}`
- **Description:** Delete a company
- **Authorization:** Bearer Token (website-admin)
- **Response:**
  ```json
  {
    "success": true,
    "message": "Company deleted successfully"
  }
  ```

---

## Department Management

### Create Department
- **Method:** POST
- **Endpoint:** `/api/companies/{companyId}/departments`
- **Description:** Create a new department
- **Authorization:** Bearer Token (company-admin)
- **Request Body:**
  ```json
  {
    "name": "Department Name",
    "hodId": "head-of-department-user-id"
  }
  ```
- **Response:**
  ```json
  {
    "id": "department-id",
    "name": "Department Name",
    "hod": {
      "id": "user-id",
      "name": "HOD Name"
    },
    "company": {
      "id": "company-id",
      "name": "Company Name"
    },
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```

### Get All Departments
- **Method:** GET
- **Endpoint:** `/api/companies/{companyId}/departments`
- **Description:** Get all departments for a company
- **Authorization:** Bearer Token (company member)
- **Response:**
  ```json
  [
    {
      "id": "department-id",
      "name": "Department Name",
      "hod": {
        "id": "user-id",
        "name": "HOD Name"
      },
      "employeesCount": 10
    }
  ]
  ```

### Get Department by ID
- **Method:** GET
- **Endpoint:** `/api/departments/{id}`
- **Description:** Get details of a specific department
- **Authorization:** Bearer Token (company member)
- **Response:**
  ```json
  {
    "id": "department-id",
    "name": "Department Name",
    "hod": {
      "id": "user-id",
      "name": "HOD Name",
      "email": "hod@example.com"
    },
    "company": {
      "id": "company-id",
      "name": "Company Name"
    },
    "employees": [
      {
        "id": "user-id",
        "name": "Employee Name",
        "designation": "Job Title"
      }
    ],
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
  ```

### Update Department
- **Method:** PUT
- **Endpoint:** `/api/departments/{id}`
- **Description:** Update department details
- **Authorization:** Bearer Token (company-admin)
- **Request Body:**
  ```json
  {
    "name": "Updated Department Name",
    "hodId": "new-head-of-department-user-id"
  }
  ```
- **Response:** Updated department object

### Delete Department
- **Method:** DELETE
- **Endpoint:** `/api/departments/{id}`
- **Description:** Delete a department
- **Authorization:** Bearer Token (company-admin)
- **Response:**
  ```json
  {
    "success": true,
    "message": "Department deleted successfully"
  }
  ```

---

## Event Management

### Create Event
- **Method:** POST
- **Endpoint:** `/api/events`
- **Description:** Create a new event
- **Authorization:** Bearer Token (company-admin or HOD)
- **Request Body:** Multipart Form Data
  - `name`: Event name
  - `description`: Event description
  - `departmentId`: Department ID
  - `documents`: Array of files (optional)
  - `employees`: Array of employee IDs (optional)
- **Response:**
  ```json
  {
    "id": "event-id",
    "name": "Event Name",
    "description": "Event Description",
    "department": {
      "id": "department-id",
      "name": "Department Name"
    },
    "hod": {
      "id": "user-id",
      "name": "HOD Name"
    },
    "documents": [
      {
        "id": "document-id",
        "name": "document.pdf",
        "url": "https://example.com/document.pdf"
      }
    ],
    "employees": [
      {
        "id": "user-id",
        "name": "Employee Name"
      }
    ],
    "status": "pending|approved|rejected",
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```

### Get All Events
- **Method:** GET
- **Endpoint:** `/api/events`
- **Description:** Get all events (with filtering)
- **Authorization:** Bearer Token (company member)
- **Query Parameters:**
  - `departmentId`: Filter by department
  - `status`: Filter by status
  - `page`: Page number
  - `limit`: Items per page
- **Response:**
  ```json
  {
    "totalItems": 30,
    "totalPages": 3,
    "currentPage": 1,
    "events": [
      {
        "id": "event-id",
        "name": "Event Name",
        "department": {
          "id": "department-id",
          "name": "Department Name"
        },
        "status": "pending|approved|rejected",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

### Get Event by ID
- **Method:** GET
- **Endpoint:** `/api/events/{id}`
- **Description:** Get details of a specific event
- **Authorization:** Bearer Token (company member)
- **Response:** Full event object

### Update Event
- **Method:** PUT
- **Endpoint:** `/api/events/{id}`
- **Description:** Update event details
- **Authorization:** Bearer Token (event creator, company-admin or HOD)
- **Request Body:** Same as create event
- **Response:** Updated event object

### Delete Event
- **Method:** DELETE
- **Endpoint:** `/api/events/{id}`
- **Description:** Delete an event
- **Authorization:** Bearer Token (event creator, company-admin or HOD)
- **Response:**
  ```json
  {
    "success": true,
    "message": "Event deleted successfully"
  }
  ```

### Submit Event for Approval
- **Method:** POST
- **Endpoint:** `/api/events/{id}/submit`
- **Description:** Submit an event for approval
- **Authorization:** Bearer Token (event creator)
- **Request Body:**
  ```json
  {
    "approverEmail": "approver@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Event submitted for approval",
    "status": "pending"
  }
  ```

### Approve/Reject Event
- **Method:** POST
- **Endpoint:** `/api/events/{id}/approve`
- **Description:** Approve or reject an event
- **Authorization:** Bearer Token (approver, company-admin)
- **Request Body:**
  ```json
  {
    "approved": true,
    "comments": "Approval comments (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Event approved/rejected",
    "status": "approved|rejected"
  }
  ```

---

## RACI Matrix Management

### Create RACI Matrix
- **Method:** POST
- **Endpoint:** `/api/raci-matrices`
- **Description:** Create a new RACI matrix
- **Authorization:** Bearer Token (company-admin or HOD)
- **Request Body:**
  ```json
  {
    "eventId": "event-id",
    "tasks": [
      {
        "name": "Task 1",
        "responsible": ["user-id-1", "user-id-2"],
        "accountable": ["user-id-3"],
        "consulted": ["user-id-4", "user-id-5"],
        "informed": ["user-id-6", "user-id-7"]
      }
    ],
    "financialLimits": {
      "task-1-responsible-user-id-1": true,
      "task-1-accountable-user-id-3": true
    }
  }
  ```
- **Response:**
  ```json
  {
    "id": "raci-matrix-id",
    "event": {
      "id": "event-id",
      "name": "Event Name"
    },
    "tasks": [
      {
        "id": "task-id",
        "name": "Task 1",
        "assignments": [
          {
            "user": {
              "id": "user-id-1",
              "name": "User Name"
            },
            "role": "responsible",
            "financialLimit": true
          }
        ]
      }
    ],
    "createdAt": "2023-01-01T00:00:00Z",
    "status": "draft|pending|approved"
  }
  ```

### Get RACI Matrix by Event ID
- **Method:** GET
- **Endpoint:** `/api/events/{eventId}/raci-matrix`
- **Description:** Get RACI matrix for a specific event
- **Authorization:** Bearer Token (company member)
- **Response:** Full RACI matrix object

### Get RACI Matrix by ID
- **Method:** GET
- **Endpoint:** `/api/raci-matrices/{id}`
- **Description:** Get details of a specific RACI matrix
- **Authorization:** Bearer Token (company member)
- **Response:** Full RACI matrix object

### Update RACI Matrix
- **Method:** PUT
- **Endpoint:** `/api/raci-matrices/{id}`
- **Description:** Update RACI matrix details
- **Authorization:** Bearer Token (matrix creator, company-admin)
- **Request Body:** Same as create RACI matrix
- **Response:** Updated RACI matrix object

### Delete RACI Matrix
- **Method:** DELETE
- **Endpoint:** `/api/raci-matrices/{id}`
- **Description:** Delete a RACI matrix
- **Authorization:** Bearer Token (matrix creator, company-admin)
- **Response:**
  ```json
  {
    "success": true,
    "message": "RACI matrix deleted successfully"
  }
  ```

### Submit RACI Matrix for Approval
- **Method:** POST
- **Endpoint:** `/api/raci-matrices/{id}/submit`
- **Description:** Submit a RACI matrix for approval
- **Authorization:** Bearer Token (matrix creator)
- **Request Body:**
  ```json
  {
    "approverEmail": "approver@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "RACI matrix submitted for approval",
    "status": "pending"
  }
  ```

### Approve/Reject RACI Matrix
- **Method:** POST
- **Endpoint:** `/api/raci-matrices/{id}/approve`
- **Description:** Approve or reject a RACI matrix
- **Authorization:** Bearer Token (approver, company-admin)
- **Request Body:**
  ```json
  {
    "approved": true,
    "comments": "Approval comments (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "RACI matrix approved/rejected",
    "status": "approved|rejected"
  }
  ```

### Get User RACI Assignments
- **Method:** GET
- **Endpoint:** `/api/users/{userId}/raci-assignments`
- **Description:** Get RACI assignments for a specific user
- **Authorization:** Bearer Token (self, company-admin)
- **Query Parameters:**
  - `role`: Filter by RACI role (responsible, accountable, consulted, informed)
  - `status`: Filter by status (pending, in-progress, completed)
- **Response:**
  ```json
  [
    {
      "id": "assignment-id",
      "role": "responsible|accountable|consulted|informed",
      "financialLimit": true,
      "task": {
        "id": "task-id",
        "name": "Task Name",
        "status": "not-started|in-progress|completed"
      },
      "event": {
        "id": "event-id",
        "name": "Event Name"
      }
    }
  ]
  ```

### Update Task Status
- **Method:** PATCH
- **Endpoint:** `/api/tasks/{taskId}/status`
- **Description:** Update the status of a task
- **Authorization:** Bearer Token (assigned user, company-admin)
- **Request Body:**
  ```json
  {
    "status": "not-started|in-progress|completed"
  }
  ```
- **Response:**
  ```json
  {
    "id": "task-id",
    "name": "Task Name",
    "status": "not-started|in-progress|completed",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
  ```

---

## Meeting Management

### Create Meeting
- **Method:** POST
- **Endpoint:** `/api/meetings`
- **Description:** Create a new meeting
- **Authorization:** Bearer Token (company member)
- **Request Body:**
  ```json
  {
    "title": "Meeting Title",
    "description": "Meeting Description",
    "date": "2023-01-15",
    "startTime": "10:00",
    "endTime": "11:00",
    "attendees": ["user-id-1", "user-id-2"]
  }
  ```
- **Response:**
  ```json
  {
    "id": "meeting-id",
    "title": "Meeting Title",
    "description": "Meeting Description",
    "date": "2023-01-15",
    "startTime": "10:00",
    "endTime": "11:00",
    "organizer": {
      "id": "user-id",
      "name": "Organizer Name"
    },
    "attendees": [
      {
        "id": "user-id-1",
        "name": "Attendee Name"
      }
    ],
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```

### Get All Meetings
- **Method:** GET
- **Endpoint:** `/api/meetings`
- **Description:** Get all meetings (with filtering)
- **Authorization:** Bearer Token (company member)
- **Query Parameters:**
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
  - `userId`: Filter by user attendance
- **Response:**
  ```json
  [
    {
      "id": "meeting-id",
      "title": "Meeting Title",
      "date": "2023-01-15",
      "startTime": "10:00",
      "endTime": "11:00",
      "organizer": {
        "id": "user-id",
        "name": "Organizer Name"
      }
    }
  ]
  ```

### Get Meeting by ID
- **Method:** GET
- **Endpoint:** `/api/meetings/{id}`
- **Description:** Get details of a specific meeting
- **Authorization:** Bearer Token (company member)
- **Response:** Full meeting object

### Update Meeting
- **Method:** PUT
- **Endpoint:** `/api/meetings/{id}`
- **Description:** Update meeting details
- **Authorization:** Bearer Token (meeting organizer, company-admin)
- **Request Body:** Same as create meeting
- **Response:** Updated meeting object

### Delete Meeting
- **Method:** DELETE
- **Endpoint:** `/api/meetings/{id}`
- **Description:** Delete a meeting
- **Authorization:** Bearer Token (meeting organizer, company-admin)
- **Response:**
  ```json
  {
    "success": true,
    "message": "Meeting deleted successfully"
  }
  ```

### Get Meetings by Date Range
- **Method:** GET
- **Endpoint:** `/api/meetings/calendar`
- **Description:** Get meetings for calendar view
- **Authorization:** Bearer Token (company member)
- **Query Parameters:**
  - `startDate`: Start date
  - `endDate`: End date
- **Response:**
  ```json
  [
    {
      "date": "2023-01-15",
      "meetings": [
        {
          "id": "meeting-id",
          "title": "Meeting Title",
          "startTime": "10:00",
          "endTime": "11:00"
        }
      ]
    }
  ]
  ```

---

## Dashboard & Analytics

### Get Website Admin Dashboard Stats
- **Method:** GET
- **Endpoint:** `/api/dashboard/website-admin`
- **Description:** Get statistics for website admin dashboard
- **Authorization:** Bearer Token (website-admin)
- **Response:**
  ```json
  {
    "totalCompanies": 24,
    "totalAdmins": 36,
    "newCompaniesThisMonth": 5,
    "pendingApprovals": 8,
    "recentCompanies": [
      {
        "id": "company-id",
        "name": "Company Name",
        "admins": 3,
        "createdAt": "2023-06-12T00:00:00Z"
      }
    ],
    "analytics": {
      "companiesGrowth": [
        { "month": "Jan", "count": 2 },
        { "month": "Feb", "count": 3 }
      ],
      "usersGrowth": [
        { "month": "Jan", "count": 10 },
        { "month": "Feb", "count": 15 }
      ]
    }
  }
  ```

### Get Company Admin Dashboard Stats
- **Method:** GET
- **Endpoint:** `/api/dashboard/company-admin`
- **Description:** Get statistics for company admin dashboard
- **Authorization:** Bearer Token (company-admin)
- **Response:**
  ```json
  {
    "totalUsers": 120,
    "activeUsers": 110,
    "pendingUsers": 10,
    "departmentsCount": 8,
    "recentEvents": [
      {
        "id": "event-id",
        "name": "Event Name",
        "status": "pending|approved|rejected",
        "createdAt": "2023-06-12T00:00:00Z"
      }
    ],
    "raciMatricesCount": 15,
    "analytics": {
      "usersByDepartment": [
        { "department": "Marketing", "count": 20 },
        { "department": "Finance", "count": 15 }
      ],
      "eventsByStatus": [
        { "status": "Approved", "count": 10 },
        { "status": "Pending", "count": 5 },
        { "status": "Rejected", "count": 2 }
      ]
    }
  }
  ```

### Get User Dashboard Stats
- **Method:** GET
- **Endpoint:** `/api/dashboard/user`
- **Description:** Get statistics for user dashboard
- **Authorization:** Bearer Token (any user)
- **Response:**
  ```json
  {
    "responsibleTasks": 5,
    "accountableTasks": 2,
    "consultedTasks": 8,
    "informedTasks": 12,
    "upcomingTasks": [
      {
        "id": "task-id",
        "name": "Task Name",
        "role": "responsible|accountable|consulted|informed",
        "dueDate": "2023-06-20",
        "status": "not-started|in-progress|completed"
      }
    ],
    "upcomingMeetings": [
      {
        "id": "meeting-id",
        "title": "Meeting Title",
        "date": "2023-06-15",
        "startTime": "10:00"
      }
    ]
  }
  ```

### Get RACI Dashboard Stats
- **Method:** GET
- **Endpoint:** `/api/dashboard/raci`
- **Description:** Get RACI tracking statistics
- **Authorization:** Bearer Token (company-admin or HOD)
- **Query Parameters:**
  - `eventId`: Filter by event
  - `departmentId`: Filter by department
- **Response:**
  ```json
  {
    "totalTasks": 25,
    "completedTasks": 15,
    "inProgressTasks": 7,
    "notStartedTasks": 3,
    "completionPercentage": 60,
    "tasksByDepartment": [
      { "department": "Marketing", "completed": 5, "total": 8 },
      { "department": "Finance", "completed": 10, "total": 17 }
    ],
    "userPerformance": [
      { 
        "user": "User Name", 
        "responsible": 5,
        "accountable": 2,
        "completed": 4,
        "pending": 3
      }
    ]
  }
  ```
