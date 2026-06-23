# ABEMIS Integration

> Integration plan for synchronizing project data from the Agricultural and Biosystems Engineering Management Information System (ABEMIS) into INFRA Watch.

---

## 1. Scope & Focus

Unlike FMR Watch which targets Farm-to-Market Road (FMR) projects, INFRA Watch is dedicated to projects under BAFE's AMEFIP umbrella:
- **Agricultural Machinery, Equipment and Facilities Support Services** (AMSS)
- **Irrigation Network Services** (INS)

This data is extracted from the ABEMIS database specifically for the fiscal years **2021 to 2026**.

---

## 2. API Specifications

### 2.1 Endpoint
The integration relies on the standard ABEMIS AMEFIP list API:
```http
GET {{ABEMIS_BASE_URL}}/api/infra-amefip-list
```

### 2.2 Query Parameters
To query specific pages or sync dates, the client requests the following parameters:

| Parameter | Type | Required | Value / Description |
| :--- | :--- | :---: | :--- |
| `page` | `integer` | ❌ | Current page number (default: `1`) |
| `limit` | `integer` | ❌ | Number of records per page (default: `10`, max `100`) |
| `apiKey` | `string` | ✅ | Authorization token passed via `x-api-key` header |

---

## 3. Data Transformation & Mapping

The project structure returned from the ABEMIS API is transformed into the internal database schema for consistency and query speed.

### Field Map: ABEMIS Response → INFRA Watch Database

| ABEMIS JSON Field | DB Column | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `project_id` | `source_project_id` | `text` | Unique project identifier (e.g. `2019-R8-LEY-INFRA-NRP-DD-00009`) |
| `prexc_program` | `source_agency` | `text` | Mapped to agency program (e.g. `'BAFE-AMEFIP'`) |
| `sub_program` | `source_agency` | `text` | If `'Irrigation Network Services'`, mapped to `'BAFE-INS'` |
| `project_title` | `name` | `text` | Project title |
| `description` | `description` | `text` | Scope description |
| `status` | `status` | `text` | Mapped to: `'planned'`, `'ongoing'`, `'completed'`, `'suspended'` |
| `project_type` | `sector` | `text` | Project sector/type (e.g. `'Diversion Dam'`) |
| `province` | `province` | `text` | Province name |
| `municipality` | `municipality` | `text` | Municipality name |
| `barangay` | `barangay` | `text` | Barangay name |
| `latitude` | `latitude` | `real` | Coordinate |
| `longitude` | `longitude` | `real` | Coordinate |
| `allocated_amount` | `budget` | `real` | Budget allocated |
| `abc` | `abc` | `real` | Approved Budget for Contract |
| `contractor` | `contractor_name` | `text` | Name of the construction firm |
| `date_completed` | `actual_completion_date`| `timestamp`| Actual project completion / handover date |
| `calendar_days` | `calendar_days` | `integer` | Calendar days to complete |
| `year_funded` | `year_funded` | `text` | Funding year (2021–2026) |
| `operating_unit` | `implementing_agency`| `text` | Implementing government operating unit |
| `geotag` | `metadata.geotag` | `jsonb` | Array of geotagged progress photos |
| `proposalDocuments` | `metadata.documents`| `jsonb` | Official documents (e.g. POW, validation report, DED) |

---

## 4. Status Mapping Logic

ABEMIS statuses vary and must be normalized before insertion into the database:

```typescript
function mapAbemisStatus(abemisStatus: string): 'planned' | 'ongoing' | 'completed' | 'suspended' {
  const status = abemisStatus.toLowerCase().trim();
  switch (status) {
    case 'not yet started':
    case 'planned':
    case 'for implementation':
    case 'approved':
      return 'planned';
    case 'on going':
    case 'ongoing':
    case 'under construction':
      return 'ongoing';
    case 'completed':
    case 'turned over':
    case 'turned-over':
      return 'completed';
    case 'suspended':
    case 'cancelled':
    case 'terminated':
      return 'suspended';
    default:
      return 'planned';
  }
}
```

---

## 5. Synchronization Workflows

Synchronization is executed in two ways:
1. **Incremental Sync (Automated)**: Runs every night at 2:00 AM via a cron job (Upstash Workflow). Fetches projects updated within the last 24 hours.
2. **Full Sync (Manual)**: Initiated by a Super Admin from the dashboard. Iterates through pages to refresh the entire 2021-2026 database.

```
Upstash Workflow Cron (2:00 AM)
           │
           ▼
Trigger API: `/api/sync/incremental`
           │
           ▼
Check ABEMIS for AMEFIP/INS records modified in the last 24 hours
           │
     ┌─────┴──────────────┐
     ▼                    ▼
[Records Found]     [No Records]
     │                    │
     ▼                    ▼
Loop and upsert to     Complete log
PostgreSQL database       & exit
     │
     ▼
Generate sync report in `sync_logs`
```

---

## 6. API Proxy & Caching Strategy

To secure the connection to ABEMIS and protect public performance, the client never communicates with ABEMIS directly.

### Proxy Endpoint: `/api/projects`
Queries for projects from the frontend client hit `/api/projects` instead of the ABEMIS endpoint. The proxy layer:
1. Validates queries using Zod.
2. Checks Redis cache using the hashed query params as a key.
3. If it is a cache **HIT**, it returns the cached data immediately.
4. If it is a cache **MISS**, it fetches data from PostgreSQL (synced from ABEMIS).
5. Stores the query result back into Redis with a 1-hour expiration time (TTL).

```
[Browser Request] ──► [/api/projects] ──► [Redis Cache Check]
                                                 │
                                         ┌───────┴───────┐
                                      (HIT)           (MISS)
                                         │               │
                                         ▼               ▼
                                 [Return Data]   [Query Postgres DB]
                                                         │
                                                         ▼
                                                 [Save in Redis]
                                                         │
                                                         ▼
                                                 [Return Data]
```
