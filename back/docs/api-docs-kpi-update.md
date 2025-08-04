# Event Management API - KPI Field Update

This document outlines the changes made to the Event Management APIs to include the new KPI (Key Performance Indicators) field.

## Overview

A new `kpi` field has been added to the Event model to store Key Performance Indicators for events. This field is optional and accepts text data.

## Database Changes

### Events Table Schema Update
```sql
ALTER TABLE events ADD COLUMN kpi TEXT;
```

## API Changes

### 1. Create Event API

**Endpoint**: `POST /api/events`

**New Request Body Field**:
```json
{
  "name": "Event Name",
  "description": "Event Description",
  "division": "Engineering",
  "departmentId": 1,
  "priority": "high",
  "eventType": "webinar",
  "kpi": "Key Performance Indicators for this event",  // NEW FIELD
  "document": File (optional),
  "employees": [1, 2, 3],
  "tasks": [...]
}
```

**New Response Field**:
```json
{
  "id": 1,
  "name": "Event Name",
  "description": "Event Description",
  "division": "Engineering",
  "priority": "high",
  "eventType": "webinar",
  "kpi": "Key Performance Indicators for this event",  // NEW FIELD
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

**New Response Field**:
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
      "eventType": "webinar",
      "kpi": "Key Performance Indicators for this event",  // NEW FIELD
      "department": {...},
      "status": "pending",
      "createdAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### 3. Get Event by ID API

**Endpoint**: `GET /api/events/{id}`

**New Response Field**:
```json
{
  "id": 1,
  "name": "Event Name",
  "description": "Event Description",
  "division": "Engineering",
  "priority": "high",
  "eventType": "webinar",
  "kpi": "Key Performance Indicators for this event",  // NEW FIELD
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

**New Request Body Field**:
```json
{
  "name": "Updated Event Name",
  "description": "Updated Event Description",
  "division": "Operations",
  "departmentId": 1,
  "priority": "medium",
  "eventType": "meeting",
  "kpi": "Updated Key Performance Indicators for this event",  // NEW FIELD
  "employees": [1, 2, 3]
}
```

**New Response Field**: The response will include the updated `kpi` field in the same format as the Get Event by ID response.

## Field Details

### KPI Field
- **Type**: String (TEXT in database)
- **Required**: No (optional)
- **Description**: Key Performance Indicators for the event
- **Example Values**:
  - "Increase customer satisfaction by 15%"
  - "Reduce processing time by 20%"
  - "Achieve 95% completion rate"
  - "Meet quarterly revenue targets of $500K"

## Migration Instructions

### 1. Database Migration
Run the migration script to add the KPI column:
```bash
node scripts/migrate-add-kpi-to-events.js
```

### 2. Prisma Schema Update
The Prisma schema has been updated to include the KPI field:
```prisma
model Event {
  // ... existing fields
  kpi              String?         @map("kpi")
  // ... remaining fields
}
```

### 3. Frontend Implementation
Update your frontend forms and displays to include the KPI field:

#### Create/Edit Event Form
```javascript
// Add KPI field to your form
const [kpi, setKpi] = useState('');

// Include in form submission
const formData = new FormData();
formData.append('kpi', kpi);
// ... other fields
```

#### Event Display
```javascript
// Display KPI in event details
{event.kpi && (
  <div className="kpi-section">
    <h4>Key Performance Indicators</h4>
    <p>{event.kpi}</p>
  </div>
)}
```

## Backward Compatibility

- The KPI field is optional, so existing events will have `null` values
- All existing API endpoints continue to work without the KPI field
- Frontend applications can gradually adopt the KPI field

## Testing

### Test Cases
1. **Create Event with KPI**: Verify KPI is stored and returned
2. **Create Event without KPI**: Verify null value is handled
3. **Update Event KPI**: Verify KPI can be updated
4. **Get Events**: Verify KPI appears in list responses
5. **Get Event by ID**: Verify KPI appears in detail responses

### Example Test Request
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Test Event" \
  -F "description=Test Description" \
  -F "departmentId=1" \
  -F "kpi=Test KPI for this event"
```

## Notes

- The KPI field supports multi-line text
- Consider implementing character limits if needed
- The field is searchable and can be used for filtering in future enhancements
- Consider adding validation rules for KPI format if required 