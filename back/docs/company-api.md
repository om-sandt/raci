# Company API Documentation

This document provides information about the Company API endpoints in the RACI application.

## Get All Companies

Retrieves a list of all companies (for website admins).

- **URL**: `/api/companies`
- **Method**: `GET`
- **Auth Required**: Yes (website_admin role)
- **Query Parameters**:
  - `search` (optional): Filter companies by name or domain
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Number of items per page (default: 10)

### Success Response

- **Code**: 200
- **Content Example** (note: `panId` is optional and may be `null` if not provided):

```json
{
  "totalItems": 50,
  "totalPages": 5,
  "currentPage": 1,
  "companies": [
    {
      "id": 1,
      "name": "Acme Corporation",
      "logoUrl": "/uploads/acme-logo.png",
      "domain": "acme.com",
      "industry": "Technology",
      "size": "Large (1000+ employees)",
      "panId": "AAAPL1234C",
      "projectName": "RACI Platform",
      "projectLogo": "/uploads/project-logo.png",
      "adminsCount": 3,
      "createdAt": "2023-01-15T10:30:00Z",
      "updatedAt": "2023-06-20T14:25:10Z"
    },
    // More companies...
  ]
}
```

## Get Company by ID

Retrieves detailed information about a specific company.

- **URL**: `/api/companies/:id`
- **Method**: `GET`
- **Auth Required**: Yes (website_admin, company_admin, hod, or any company member)
- **URL Parameters**:
  - `id`: Company ID

### Success Response

- **Code**: 200
- **Content Example**:

```json
{
  "id": 1,
  "name": "Acme Corporation",
  "logoUrl": "/uploads/acme-logo.png",
  "domain": "acme.com",
  "industry": "Technology",
  "size": "Large (1000+ employees)",
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
  "createdAt": "2023-01-15T10:30:00Z",
  "updatedAt": "2023-06-20T14:25:10Z"
}
```

## Get My Company

Retrieves the company of the logged-in company admin or HOD.

- **URL**: `/api/companies/my-company`
- **Method**: `GET`
- **Auth Required**: Yes (company_admin or hod)

### Success Response

- **Code**: 200
- **Content Example**:

```json
{
  "id": 1,
  "name": "Acme Corporation",
  "logoUrl": "/uploads/acme-logo.png",
  "domain": "acme.com",
  "industry": "Technology",
  "size": "Large (1000+ employees)",
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
  "createdAt": "2023-01-15T10:30:00Z",
  "updatedAt": "2023-06-20T14:25:10Z",
  "stats": {
    "totalUsers": 150,
    "totalDepartments": 8,
    "totalEvents": 25
  }
}
```

## Create Company

This section is removed as per the instructions.
