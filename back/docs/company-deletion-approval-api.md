# Company Deletion Approval System API Documentation

This document describes the two-level approval system for company deletion in the website admin dashboard.

## Overview

The company deletion approval system requires two website admins:
1. **Requester**: The admin who wants to delete a company
2. **Approver**: Another admin who must approve the deletion

When a company deletion is requested, the system creates a deletion request that must be approved by the selected admin before the company is actually deleted.

The system provides comprehensive tracking of all deletion requests through dedicated API endpoints for dashboard management.

## API Endpoints

### 1. Create Company Deletion Request

**Endpoint**: `POST /api/companies/:id/deletion-request`
**Auth**: Website Admin only
**Description**: Create a new company deletion request

**Request Body**:
```json
{
  "approverId": 2,
  "reason": "Company no longer active - requested by management"
}
```

**Request Parameters**:
- `id` (path): Company ID to delete
- `approverId` (body, required): ID of the website admin who should approve the deletion
- `reason` (body, optional): Reason for the deletion request

**Success Response** (201):
```json
{
  "success": true,
  "message": "Deletion request created successfully",
  "data": {
    "requestId": 1,
    "companyName": "Tech Corp",
    "approverName": "John Doe",
    "createdAt": "2023-12-01T10:30:00Z"
  }
}
```

**Error Responses**:
- `400`: Approver is required / You cannot select yourself as approver / Deletion request already pending
- `404`: Company not found / Selected approver not found

---

### 2. Get All Company Deletion Requests

**Endpoint**: `GET /api/companies/deletion-requests/all`
**Auth**: Website Admin only
**Description**: Get all company deletion requests for the website admin dashboard

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "request_id": 1,
      "company_id": 5,
      "company_name": "Tech Corp",
      "logo_url": "/uploads/logo-123.png",
      "reason": "Company no longer active",
      "status": "pending",
      "created_at": "2023-12-01T10:30:00Z",
      "processed_at": null,
      "updated_at": "2023-12-01T10:30:00Z",
      "requested_by_name": "Admin One",
      "requested_by_email": "admin1@example.com",
      "approver_name": "John Doe",
      "approver_email": "john@example.com"
    },
    {
      "request_id": 2,
      "company_id": 6,
      "company_name": "Startup Inc",
      "logo_url": "/uploads/logo-456.png",
      "reason": "Need more information before proceeding with deletion",
      "status": "rejected",
      "created_at": "2023-12-01T09:15:00Z",
      "processed_at": "2023-12-01T11:45:00Z",
      "updated_at": "2023-12-01T11:45:00Z",
      "requested_by_name": "Admin Two",
      "requested_by_email": "admin2@example.com",
      "approver_name": "Jane Smith",
      "approver_email": "jane@example.com"
    }
  ]
}
```

**Note**: This endpoint returns all deletion requests regardless of status (pending, approved, rejected) and includes both requester and approver details.

---

### 3. Get Available Approvers

**Endpoint**: `GET /api/companies/deletion-requests/approvers`
**Auth**: Website Admin only
**Description**: Get list of other website admins who can approve deletion requests

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 3,
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}
```

---

### 4. Get Pending Deletion Requests

**Endpoint**: `GET /api/companies/deletion-requests/pending`
**Auth**: Website Admin only
**Description**: Get all pending deletion requests assigned to the authenticated admin

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "request_id": 1,
      "company_id": 5,
      "company_name": "Tech Corp",
      "logo_url": "/uploads/logo-123.png",
      "reason": "Company no longer active",
      "created_at": "2023-12-01T10:30:00Z",
      "requested_by_name": "Admin One",
      "requested_by_email": "admin1@example.com"
    }
  ]
}
```

---

### 5. Process Deletion Request (Approve/Reject)

**Endpoint**: `PUT /api/companies/deletion-requests/:requestId`
**Auth**: Website Admin only
**Description**: Approve or reject a company deletion request

**Request Parameters**:
- `requestId` (path): ID of the deletion request

**Request Body for Approval**:
```json
{
  "action": "approve",
  "rejectionReason": ""
}
```

**Request Body for Rejection**:
```json
{
  "action": "reject",
  "rejectionReason": "Need more information before proceeding with deletion"
}
```

**Field Validation**:
- `action` (required): Must be either "approve" or "reject"
- `rejectionReason` (required for rejection): Must be provided when rejecting

**Note**: When rejecting, the rejection reason will overwrite the original creation reason in the database.

**Success Response for Approval** (200):
```json
{
  "success": true,
  "message": "Company deletion approved and company deleted successfully"
}
```

**Success Response for Rejection** (200):
```json
{
  "success": true,
  "message": "Company deletion request rejected successfully"
}
```

**Error Responses**:
- `400`: Invalid action / Rejection reason required when rejecting
- `404`: Deletion request not found or not authorized to process

---

## Workflow

1. **Request Creation**: Admin A wants to delete Company X
   - Admin A selects Admin B as approver
   - Admin A provides optional reason
   - System creates deletion request

2. **Approval Process**: Admin B reviews the request
   - Admin B can see pending requests via the pending endpoint
   - Admin B approves (company gets deleted) or rejects (with mandatory reason)

3. **Completion**: 
   - If approved: Company and all associated data/files are deleted
   - If rejected: Company remains, request is marked as rejected with reason

## Database Schema

```sql
CREATE TABLE company_deletion_requests (
  request_id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
  requested_by INT REFERENCES website_admins(admin_id) ON DELETE SET NULL,
  approver_id INT REFERENCES website_admins(admin_id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reason TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Note**: The `reason` column serves dual purpose:
- **During creation**: Stores the reason for requesting deletion
- **During rejection**: Gets overwritten with the rejection reason

## Security Features

- Only website admins can create and process deletion requests
- Admins cannot approve their own deletion requests
- Only pending requests can be processed
- Proper authorization checks ensure admins can only process requests assigned to them
- All actions are logged for audit purposes

## Frontend Integration

The frontend should:
1. Replace direct company deletion with the request creation flow
2. Show a dropdown of available approvers when creating requests
3. Display all deletion requests in a dedicated tab in the admin dashboard using the `/all` endpoint
4. Display pending approval requests in the admin dashboard
5. Provide approve/reject interface with reason input for rejections
6. Show request status and history with detailed information

## Migration

To add this system to existing databases, run:
```sql
-- Run the migration script
\i db/migrate_add_company_deletion_requests.sql
``` 