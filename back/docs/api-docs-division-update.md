# Division Field API Updates - Frontend Implementation Guide

## Overview

The API has been updated to include a new **Division** field for both User and Event entities. This field represents the business unit or division within an organization.

## 🔄 **Changed Endpoints**

### User Management Endpoints

#### 1. **Create User** - `POST /api/users`

**New Field Added:**
- `division` (string, optional) - Business unit or division

**Example Request (form-data):**
```
name        → Alice Smith
email       → alice@acme.com
role        → company_admin
designation → Operations Manager
division    → Operations  ← NEW FIELD
phone       → +14155550123
employeeId  → ACME-ADM-01
companyId   → 1
location    → San Francisco, USA
photo       → (file) alice_profile.jpg
```

**Example Response:**
```json
{
  "id": 12,
  "name": "Alice Smith",
  "email": "alice@acme.com",
  "role": "company_admin",
  "designation": "Operations Manager",
  "division": "Operations",  ← NEW FIELD
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

#### 2. **Update User** - `PUT /api/users/{id}`

**New Field Added:**
```json
{
  "name": "Updated Name",
  "designation": "Updated Title",
  "division": "Operations",  ← NEW FIELD
  "phone": "+1234567890",
  "departmentId": 1,
  "location": "San Francisco, USA"
}
```

#### 3. **Get Users** - `GET /api/users`

**Updated Response (each user object now includes):**
```json
{
  "id": 1,
  "name": "User Name",
  "email": "user@example.com",
  "role": "user|company_admin|hod",
  "designation": "Job Title",
  "division": "Engineering",  ← NEW FIELD
  "phone": "+1234567890",
  "employeeId": "EMP123",
  "photo": "/uploads/profile-photo.jpg",
  "location": "New York, USA",
  // ... rest of user object
}
```

#### 4. **Get User by ID** - `GET /api/users/{id}`

**Updated Response includes `division` field**

### Event Management Endpoints

#### 1. **Create Event** - `POST /api/events`

**New Field Added:**
```json
{
  "name": "Event Name",
  "description": "Event Description",
  "division": "Engineering",  ← NEW FIELD
  "departmentId": 1,
  "priority": "high",
  "eventType": "webinar",
  "document": File, // optional
  "employees": [1, 2, 3],
  "tasks": [
    {
      "name": "Task 1",
      "description": "Description of Task 1",
      "status": "not_started"
    }
  ]
}
```

**Example Response:**
```json
{
  "id": 1,
  "name": "Event Name",
  "description": "Event Description",
  "division": "Engineering",  ← NEW FIELD
  "priority": "high",
  "eventType": "webinar",
  "department": {
    "id": 1,
    "name": "Department Name"
  },
  // ... rest of event object
}
```

#### 2. **Update Event** - `PUT /api/events/{id}`

**Example Request Body:**
```json
{
  "name": "Updated Event Name",
  "description": "Updated Event Description",
  "division": "Operations",  ← NEW FIELD
  "departmentId": 1,
  "priority": "medium",
  "eventType": "meeting",
  "employees": [1, 2, 3]
}
```

#### 3. **Get Events** - `GET /api/events`

**Updated Response (each event object now includes):**
```json
{
  "id": 1,
  "name": "Event Name",
  "division": "Engineering",  ← NEW FIELD
  "priority": "high",
  "eventType": "webinar",
  "department": {
    "id": 1,
    "name": "Department Name"
  },
  "status": "pending|approved|rejected",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

#### 4. **Get Event by ID** - `GET /api/events/{id}`

**Updated Response includes `division` field**

## 🛠 **Frontend Implementation Steps**

### 1. **Update Form Components**

#### User Creation/Edit Forms
```javascript
// Add division field to your user forms
const userFormFields = {
  name: '',
  email: '',
  role: '',
  designation: '',
  division: '',  // ← ADD THIS FIELD
  phone: '',
  employeeId: '',
  departmentId: '',
  location: ''
};
```

#### Event Creation/Edit Forms
```javascript
// Add division field to your event forms
const eventFormFields = {
  name: '',
  description: '',
  division: '',  // ← ADD THIS FIELD
  departmentId: '',
  priority: '',
  eventType: '',
  employees: [],
  tasks: []
};
```

### 2. **Update Display Components**

#### User Profile/List Components
```javascript
// Update user display components to show division
const UserCard = ({ user }) => (
  <div className="user-card">
    <h3>{user.name}</h3>
    <p>Role: {user.role}</p>
    <p>Designation: {user.designation}</p>
    <p>Division: {user.division}</p>  {/* ← ADD THIS LINE */}
    <p>Department: {user.department?.name}</p>
    {/* ... other user details */}
  </div>
);
```

#### Event Display Components
```javascript
// Update event display components to show division
const EventCard = ({ event }) => (
  <div className="event-card">
    <h3>{event.name}</h3>
    <p>Division: {event.division}</p>  {/* ← ADD THIS LINE */}
    <p>Department: {event.department?.name}</p>
    <p>Priority: {event.priority}</p>
    {/* ... other event details */}
  </div>
);
```

### 3. **Update API Calls**

#### Creating Users
```javascript
const createUser = async (userData) => {
  const formData = new FormData();
  formData.append('name', userData.name);
  formData.append('email', userData.email);
  formData.append('role', userData.role);
  formData.append('designation', userData.designation);
  formData.append('division', userData.division);  // ← ADD THIS LINE
  formData.append('phone', userData.phone);
  // ... append other fields
  
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

#### Creating Events
```javascript
const createEvent = async (eventData) => {
  const formData = new FormData();
  formData.append('name', eventData.name);
  formData.append('description', eventData.description);
  formData.append('division', eventData.division);  // ← ADD THIS LINE
  formData.append('departmentId', eventData.departmentId);
  // ... append other fields
  
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

### 4. **TypeScript Interface Updates**

```typescript
// Update User interface
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  designation?: string;
  division?: string;  // ← ADD THIS FIELD
  phone?: string;
  employeeId?: string;
  photo?: string;
  location?: string;
  department?: {
    id: number;
    name: string;
  };
  company?: {
    id: number;
    name: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Update Event interface
interface Event {
  id: number;
  name: string;
  description?: string;
  division?: string;  // ← ADD THIS FIELD
  priority?: string;
  eventType?: string;
  department: {
    id: number;
    name: string;
  };
  hod?: {
    id: number;
    name: string;
  };
  documents: Array<{
    id: number;
    name: string;
    url: string;
  }>;
  employees: Array<{
    id: number;
    name: string;
  }>;
  tasks: Array<{
    id: number;
    name: string;
    description?: string;
    status: string;
  }>;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}
```

## 🎯 **Filter and Search Updates**

Consider adding division-based filtering to your list views:

```javascript
// Add division filter to user listing
const getUsersWithFilters = async (filters) => {
  const params = new URLSearchParams();
  if (filters.companyId) params.append('companyId', filters.companyId);
  if (filters.departmentId) params.append('departmentId', filters.departmentId);
  if (filters.division) params.append('division', filters.division);  // ← ADD THIS
  if (filters.role) params.append('role', filters.role);
  
  const response = await fetch(`/api/users?${params.toString()}`);
  return response.json();
};
```

## ✅ **Migration Checklist**

- [ ] Add division field to user creation forms
- [ ] Add division field to user edit forms  
- [ ] Add division field to event creation forms
- [ ] Add division field to event edit forms
- [ ] Update user display components to show division
- [ ] Update event display components to show division
- [ ] Update TypeScript interfaces/PropTypes
- [ ] Update API calls to include division field
- [ ] Test user creation with division field
- [ ] Test user editing with division field
- [ ] Test event creation with division field
- [ ] Test event editing with division field
- [ ] Update any search/filter functionality to include division
- [ ] Update any reporting/analytics to include division data

## 📝 **Notes**

- The `division` field is **optional** for both users and events
- Existing records without division will return `null` or `undefined` for this field
- The field accepts any string value representing a business unit/division
- Frontend should handle gracefully when division is null/undefined
- Consider providing a dropdown or autocomplete for division values based on company structure 