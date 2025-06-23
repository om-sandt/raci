# Website Admin API Documentation

This document provides information about the Website Admin API endpoints.

## Create Website Admin

Create a new website admin.

- **URL**: `/api/website-admins`
- **Method**: `POST`
- **Auth Required**: Yes (website_admin role)
- **Content-Type**: `multipart/form-data`
- **Data Parameters**:
  - `fullName` (required): Admin's full name
  - `email` (required): Admin's email address
  - `phone` (optional): Admin's phone number
  - `password` (required): Admin's password
  - `photo` (optional): Admin's profile photo file

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
    "photo": "/uploads/profile-photo.jpg",
    "createdAt": "2023-01-15T10:30:00Z"
  }
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
    "photo": "/uploads/profile-photo.jpg"
  }
}
```
