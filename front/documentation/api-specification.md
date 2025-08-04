# Event Management API - Type of Event and KPI Relevance Fields Update

This document outlines the changes made to the Event Management APIs to include the Type of Event and KPI Relevance fields.

## Overview

Two fields have been updated/added to the Event model:
- **`eventType`**: Repurposed to store Type of Event (Operational Event or Strategic Event)
- **`kpi`**: New field to store KPI Relevance (KPI or Non KPI)

## Database Changes

### Events Table Schema Update
```sql
ALTER TABLE events ADD COLUMN kpi VARCHAR(50);
-- Note: eventType column already exists and will be repurposed for Type of Event
```

## API Changes

### 1. Create Event API

**Endpoint**: `POST /api/events`

**Updated Request Body Fields**:
  ```json
  {
  "name": "Event Name",
  "description": "Event Description",
  "division": "Engineering",
  "departmentId": 1,
  "priority": "high",
  "eventType": "Operational Event",  // Type of Event: "Operational Event" or "Strategic Event"
  "kpi": "KPI",  // KPI Relevance: "KPI" or "Non KPI"
  "document": File (optional),
  "employees": [1, 2, 3],
  "tasks": [...]
}
```

**Updated Response Fields**:
  ```json
  {
  "id": 1,
    "name": "Event Name",
    "description": "Event Description",
  "division": "Engineering",
  "priority": "high",
  "eventType": "Operational Event",  // Type of Event
  "kpi": "KPI",  // KPI Relevance
  "department": {...},
  "hod": {...},
  "documents": [...],
  "employees": [...],
  "tasks": [...],
  "status": "pending",
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```

### 2. Get All Events API

**Endpoint**: `GET /api/events`

**Updated Response Fields**:
  ```json
  {
    "totalItems": 30,
    "totalPages": 3,
    "currentPage": 1,
    "events": [
      {
      "id": 1,
        "name": "Event Name",
      "division": "Engineering",
      "priority": "high",
      "eventType": "Operational Event",  // Type of Event
      "kpi": "KPI",  // KPI Relevance
      "department": {...},
      "status": "pending",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
  ```

### 3. Get Event by ID API

**Endpoint**: `GET /api/events/{id}`

**Updated Response Fields**:
  ```json
  {
  "id": 1,
  "name": "Event Name",
  "description": "Event Description",
  "division": "Engineering",
  "priority": "high",
  "eventType": "Operational Event",  // Type of Event
  "kpi": "KPI",  // KPI Relevance
  "department": {...},
  "hod": {...},
  "creator": {...},
  "documents": [...],
  "employees": [...],
  "tasks": [...],
  "status": "pending",
  "rejectionReason": null,
    "createdAt": "2023-01-01T00:00:00Z"
  }
  ```

### 4. Update Event API

**Endpoint**: `PUT /api/events/{id}`

**Updated Request Body Fields**:
  ```json
  {
  "name": "Updated Event Name",
  "description": "Updated Event Description",
  "division": "Operations",
  "departmentId": 1,
  "priority": "medium",
  "eventType": "Strategic Event",  // Type of Event
  "kpi": "Non KPI",  // KPI Relevance
  "employees": [1, 2, 3]
}
```

**Updated Response Field**: The response will include both updated fields in the same format as the Get Event by ID response.

## Field Details

### Event Type Field (Type of Event)
- **Type**: String (VARCHAR in database)
- **Required**: No (optional)
- **Description**: Type of Event classification
- **Valid Values**:
  - "Operational Event"
  - "Strategic Event"
- **Database Mapping**: `eventType` column

### KPI Field (KPI Relevance)
- **Type**: String (VARCHAR in database)
- **Required**: No (optional)
- **Description**: KPI Relevance of the event
- **Valid Values**:
  - "KPI"
  - "Non KPI"
- **Database Mapping**: `kpi` column

## Migration Instructions

### 1. Database Migration
Run the migration script to add the KPI column:
```bash
node scripts/migrate-add-kpi-to-events.js
```

### 2. Prisma Schema Update
The Prisma schema has been updated to include both fields:
```prisma
model Event {
  // ... existing fields
  eventType        String?         @map("event_type")  // Repurposed for Type of Event
  kpi              String?         @map("kpi")  // New field for KPI Relevance
  // ... remaining fields
}
```

### 3. Frontend Implementation
Update your frontend forms and displays to include both fields:

#### Create/Edit Event Form
```javascript
// Add both fields to your form
const [eventType, setEventType] = useState('');  // Type of Event
const [kpi, setKpi] = useState('');  // KPI Relevance

// Include in form submission
const formData = new FormData();
formData.append('eventType', eventType);  // Type of Event
formData.append('kpi', kpi);  // KPI Relevance
// ... other fields
```

#### Event Display
```javascript
// Display both fields in event details
{event.eventType && (
  <div className="type-of-event-section">
    <h4>Type of Event</h4>
    <p>{event.eventType}</p>
  </div>
)}

{event.kpi && (
  <div className="kpi-relevance-section">
    <h4>KPI Relevance</h4>
    <p>{event.kpi}</p>
  </div>
)}
```

## Backward Compatibility

- Both fields are optional, so existing events will have `null` values
- The `eventType` field is repurposed from its previous usage
- All existing API endpoints continue to work without these fields
- Frontend applications can gradually adopt both fields

## Testing

### Test Cases
1. **Create Event with both fields**: Verify both fields are stored and returned
2. **Create Event without fields**: Verify null values are handled
3. **Update Event fields**: Verify both fields can be updated
4. **Get Events**: Verify both fields appear in list responses
5. **Get Event by ID**: Verify both fields appear in detail responses

### Example Test Request
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Test Event" \
  -F "description=Test Description" \
  -F "departmentId=1" \
  -F "eventType=Operational Event" \
  -F "kpi=KPI"
```

## Notes

- The `eventType` field has been repurposed from its previous usage to store Type of Event
- Both fields support predefined dropdown values only
- Consider implementing validation to ensure only valid values are accepted
- The fields are searchable and can be used for filtering in future enhancements
