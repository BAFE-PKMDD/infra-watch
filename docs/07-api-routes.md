# API Routes Design

> REST API route architecture, parameter rules, and response payloads for INFRA Watch.

---

## 1. Project Directory Endpoints

### 1.1 List Projects
Fetch paginated project entries synced from ABEMIS.
- **URL**: `/api/projects`
- **Method**: `GET`
- **Query Parameters**:
  - `page`: `integer` (default: `1`)
  - `limit`: `integer` (default: `20`, max `100`)
  - `search`: `string` (title or contractor match)
  - `agency`: `'AMEFIP' | 'INS'`
  - `status`: `'planned' | 'ongoing' | 'completed' | 'suspended'`
  - `year`: `string` (e.g. `'2024'`)
  - `municipality`: `string`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalRecords": 450,
      "totalPages": 23
    },
    "data": [
      {
        "id": "uuid-here",
        "sourceProjectId": "PRJ-INS-2024-001",
        "name": "Solar Powered Irrigation System Construction",
        "sourceAgency": "INS",
        "status": "ongoing",
        "budget": 1250000.00,
        "physicalProgress": 42.5,
        "municipality": "Balamban",
        "yearFunded": "2024"
      }
    ]
  }
  ```

### 1.2 Get Project Detail
Retrieve a complete project card with documents and metadata.
- **URL**: `/api/projects/[id]`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-here",
      "sourceProjectId": "PRJ-AMEFIP-2024-001",
      "name": "Solar Powered Irrigation System Construction",
      "description": "Establishment of solar powered irrigation facilities...",
      "sourceAgency": "INS",
      "status": "ongoing",
      "sector": "Irrigation",
      "province": "Cebu",
      "municipality": "Balamban",
      "barangay": "Lias",
      "latitude": 10.4501,
      "longitude": 123.7202,
      "budget": 1250000.00,
      "abc": 1250000.00,
      "physicalProgress": 42.5,
      "financialProgress": 30.0,
      "contractorName": "Cebu Agri-Builders Inc.",
      "startDate": "2024-03-01T00:00:00Z",
      "targetCompletionDate": "2024-09-30T00:00:00Z",
      "yearFunded": "2024",
      "metadata": {
        "geotags": [],
        "documents": []
      }
    }
  }
  ```

### 1.3 Map Pins Endpoint
High-speed data retrieval for GIS mapping rendering. Returns geo-coordinates only.
- **URL**: `/api/projects/map`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "uuid-here",
      "lat": 10.4501,
      "lng": 123.7202,
      "status": "ongoing",
      "name": "Solar Powered Irrigation System Construction",
      "budget": 1250000.00
    }
  ]
  ```

---

## 2. Citizen Feedback & Interactions

### 2.1 Submit Feedback
- **URL**: `/api/projects/[id]/feedback`
- **Method**: `POST`
- **Auth Required**: Optional (Citizen can submit anonymously)
- **Request Body**:
  ```json
  {
    "rating": 5,
    "category": "quality",
    "comment": "The pipe installation looks solid and neat.",
    "isAnonymous": true,
    "media": [
      {
        "type": "image",
        "url": "https://s3.infrawatch.gov/uploads/img-123.jpg"
      }
    ]
  }
  ```

### 2.2 Vote Feedback (Helpful/Unhelpful)
- **URL**: `/api/feedback/[id]/vote`
- **Method**: `POST`
- **Auth Required**: Yes (Citizen)
- **Request Body**:
  ```json
  {
    "voteType": "helpful"
  }
  ```

---

## 3. Issue Reporting Endpoints

### 3.1 Report Issue
Submit an infrastructure issue (public citizen access).
- **URL**: `/api/issues`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "title": "Leaking Irrigation Canal",
    "description": "Water leaking through cracks in the concrete irrigation canal wall.",
    "issueType": "damage",
    "province": "Cebu",
    "municipality": "Balamban",
    "barangay": "Lias",
    "latitude": 10.4512,
    "longitude": 123.7214,
    "photoUrls": ["https://s3.infrawatch.gov/uploads/issue-img.jpg"],
    "reporterName": "Juan Dela Cruz",
    "reporterContact": "+639171234567",
    "isAnonymous": false
  }
  ```

### 3.2 Respond to Reported Issue
Add official investigation responses (Moderators or Admins).
- **URL**: `/api/issues/[id]/responses`
- **Method**: `POST`
- **Auth Required**: Yes (Admin or Municipal Moderator)
- **Request Body**:
  ```json
  {
    "message": "We have dispatched a technician to replace the valve.",
    "newStatus": "investigating",
    "isInternalOnly": false
  }
  ```

---

## 4. Administration & Synchronization

### 4.1 Trigger Manual Sync
Initiate an update run with the ABEMIS database.
- **URL**: `/api/sync/trigger`
- **Method**: `POST`
- **Auth Required**: Yes (Super Admin only)
- **Request Body**:
  ```json
  {
    "agency": "INS",
    "year": "2024",
    "forceUpdate": false
  }
  ```
- **Response (202 Accepted)**:
  ```json
  {
    "success": true,
    "message": "ABEMIS sync started in the background.",
    "syncLogId": "sync-uuid-here"
  }
  ```
