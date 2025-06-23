# API Documentation

## User RACI Endpoints

### Get My RACI Assignments

Retrieves all RACI assignments for the currently authenticated user, including their department and event information.

- **URL**: `/api/user-raci/my-assignments`
- **Method**: `GET`
- **Auth required**: Yes (JWT Token in Authorization header)

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
        "role": "R",
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

# API Documentation - Meetings Endpoints

## Meeting Management

### Create Meeting

Creates a new meeting associated with an event.

- **URL**: `/api/meetings`
- **Method**: `POST`
- **Auth required**: Yes (JWT Token in Authorization header)
- **Request Body**:

```json
{
  "eventId": "12345",
  "title": "Sprint Planning Meeting",
  "description": "Plan tasks for the upcoming sprint",
  "meetingDate": "2023-08-15T14:00:00.000Z",
  "guestUserIds": [101, 102, 103],
  "meetingUrl": "https://meet.example.com/abc123"
}
```

#### Success Response:

- **Code**: 201 Created
- **Content example**:

```json
{
  "id": 1,
  "title": "Sprint Planning Meeting",
  "description": "Plan tasks for the upcoming sprint",
  "meetingDate": "2023-08-15T14:00:00.000Z",
  "meetingUrl": "https://meet.example.com/abc123",
  "event": {
    "id": 12345,
    "name": "Product Development Sprint"
  },
  "guests": [
    {
      "id": 101,
      "name": "John Doe"
    },
    {
      "id": 102,
      "name": "Jane Smith"
    },
    {
      "id": 103,
      "name": "Bob Johnson"
    }
  ],
  "createdAt": "2023-08-01T10:30:00.000Z"
}
```

### Get All Meetings

Retrieves a list of meetings with optional filtering.

- **URL**: `/api/meetings`
- **Method**: `GET`
- **Auth required**: Yes (JWT Token in Authorization header)
- **Query Parameters**:
  - `eventId`: Filter by event ID
  - `startDate`: Filter by meetings after this date (ISO format)
  - `endDate`: Filter by meetings before this date (ISO format)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)

#### Success Response:

- **Code**: 200 OK
- **Content example**:

```json
{
  "totalItems": 25,
  "totalPages": 3,
  "currentPage": 1,
  "meetings": [
    {
      "id": 1,
      "title": "Sprint Planning Meeting",
      "description": "Plan tasks for the upcoming sprint",
      "meetingDate": "2023-08-15T14:00:00.000Z",
      "meetingUrl": "https://meet.example.com/abc123",
      "event": {
        "id": 12345,
        "name": "Product Development Sprint"
      },
      "department": {
        "name": "Engineering"
      },
      "guests": [
        {
          "id": 101,
          "name": "John Doe"
        },
        {
          "id": 102,
          "name": "Jane Smith"
        }
      ]
    }
  ]
}
```

### Get Meeting by ID

Retrieves details of a specific meeting.

- **URL**: `/api/meetings/:id`
- **Method**: `GET`
- **Auth required**: Yes (JWT Token in Authorization header)

#### Success Response:

- **Code**: 200 OK
- **Content example**:

```json
{
  "id": 1,
  "title": "Sprint Planning Meeting",
  "description": "Plan tasks for the upcoming sprint",
  "meetingDate": "2023-08-15T14:00:00.000Z",
  "meetingUrl": "https://meet.example.com/abc123",
  "event": {
    "id": 12345,
    "name": "Product Development Sprint"
  },
  "department": {
    "name": "Engineering"
  },
  "guests": [
    {
      "id": 101,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 102,
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ],
  "createdAt": "2023-08-01T10:30:00.000Z",
  "updatedAt": "2023-08-02T15:45:00.000Z"
}
```

### Update Meeting

Updates an existing meeting.

- **URL**: `/api/meetings/:id`
- **Method**: `PUT`
- **Auth required**: Yes (JWT Token in Authorization header)
- **Request Body**: Same fields as create meeting (all fields optional)

#### Success Response:

- **Code**: 200 OK
- **Content example**: Updated meeting object similar to GET response

### Delete Meeting

Deletes a meeting.

- **URL**: `/api/meetings/:id`
- **Method**: `DELETE`
- **Auth required**: Yes (JWT Token in Authorization header)

#### Success Response:

- **Code**: 200 OK
- **Content example**:

```json
{
  "success": true,
  "message": "Meeting deleted successfully"
}
```

### Get Meetings for Calendar View

Retrieves meetings within a date range for calendar display.

- **URL**: `/api/meetings/calendar`
- **Method**: `GET`
- **Auth required**: Yes (JWT Token in Authorization header)
- **Query Parameters**:
  - `startDate`: Start of date range (ISO format, required)
  - `endDate`: End of date range (ISO format, required)

#### Success Response:

- **Code**: 200 OK
- **Content example**:

```json
{
  "success": true,
  "calendarEvents": [
    {
      "id": 1,
      "title": "Sprint Planning Meeting",
      "start": "2023-08-15T14:00:00.000Z",
      "description": "Plan tasks for the upcoming sprint",
      "eventId": 12345,
      "eventName": "Product Development Sprint"
    }
  ]
}
```