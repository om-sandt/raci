# Website Admin API Documentation

This document provides information about the Website Admin API endpoints.

## Create Website Admin

Create a new website admin.

- **URL**: `/api/website-admins`
- **Method**: `POST`
- **Auth Required**: Yes (website_admin with permission)
- **Content-Type**: `application/json`
- **Data Parameters**:
  - `fullName` (required): Admin's full name
  - `email` (required): Admin's email address
  - `phone` (optional): Admin's phone number
  - `password` (required): Admin's password

**PERMISSION SYSTEM**: 
- **Main Admin**: `omvataliya23@gmail.com` always has permission to create admins
- **Other Admins**: Must have `canCreateAdmins` permission granted by the main admin
- **New Admins**: Created with `canCreateAdmins = false` by default

### Success Response

- **Code**: 201
- **Content Example**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "canCreateAdmins": false,
    "createdAt": "2023-01-15T10:30:00Z"
  }
}
```

### Error Responses

- **Code**: 403 Forbidden
- **Content Example**:

```json
{
  "success": false,
  "message": "You are not authorized to create website admins. Contact omvataliya23@gmail.com for permission."
}
```

- **Code**: 400 Bad Request
- **Content Example**:

```json
{
  "success": false,
  "message": "Admin with this email already exists"
}
```

## Update Website Admin Permissions

Update a website admin's permission to create other admins.

- **URL**: `/api/website-admins/:id/permissions`
- **Method**: `PATCH`
- **Auth Required**: Yes (ONLY omvataliya23@gmail.com)
- **Content-Type**: `application/json`
- **URL Parameters**:
  - `id`: Website Admin ID
- **Data Parameters**:
  - `canCreateAdmins` (required): Boolean - Grant or revoke admin creation permission

### Success Response

- **Code**: 200
- **Content Example**:

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
    "updatedAt": "2023-01-20T15:45:30Z"
  }
}
```

### Error Responses

- **Code**: 403 Forbidden
- **Content Example**:

```json
{
  "success": false,
  "message": "Only the main administrator can update admin permissions"
}
```

- **Code**: 400 Bad Request
- **Content Example**:

```json
{
  "success": false,
  "message": "Cannot modify main administrator permissions"
}
```

## Update Website Admin

Update a website admin's information.

- **URL**: `/api/website-admins/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (website_admin role)
- **Content-Type**: `multipart/form-data`
- **URL Parameters**:
  - `id`: Website Admin ID
- **Data Parameters**:
  - `fullName` (optional): Admin's full name
  - `phone` (optional): Admin's phone number
  - `photo` (optional): Admin's profile photo file

### Success Response

- **Code**: 200
- **Content Example**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "photo": "/uploads/updated-profile-photo.jpg",
    "createdAt": "2023-01-15T10:30:00Z",
    "updatedAt": "2023-01-20T15:45:30Z"
  }
}
```

## Login

Authenticate a website admin.

- **URL**: `/api/website-admins/login`
- **Method**: `POST`
- **Auth Required**: No
- **Data Parameters**:
  - `email` (required): Admin's email address
  - `password` (required): Admin's password

### Success Response

- **Code**: 200
- **Content Example**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "website_admin",
    "phone": "1234567890",
    "canCreateAdmins": false,
    "isMainAdmin": false
  }
}
```

**Note**: For the main admin (`omvataliya23@gmail.com`), `canCreateAdmins` and `isMainAdmin` will both be `true`.
