# Features & Modules

> Detailed functional specification of the primary user-facing modules and back-office management interfaces of INFRA Watch.

---

## 1. Public Transparency Portal

The public portion of INFRA Watch provides open access to the database of AMEFIP and INS projects from 2021 to 2026.

### 1.1 Interactive GIS Map Interface
An interactive mapping console that allows citizens to view the geographical distribution of infrastructure projects.
- **WMS Layers Integration**: Integrates directly with GeoServer to render custom shapefiles (e.g. municipal boundaries, watersheds, irrigation networks).
- **Cluster Markers**: Aggregates nearby projects into numeric cluster badges. Clicking zoom-in reveals individual projects.
- **Status Color Coding**: Pin colors match the project status:
  - 🟢 **Green**: Completed
  - 🟡 **Yellow**: Ongoing
  - 🔵 **Blue**: Planned
  - 🔴 **Red**: Suspended
- **Geographic Filtering**: Quick boundaries selector for Region, Province, and Municipality.
- **Project Detail Popover**: Hovering or clicking a marker pops up a card displaying title, budget, contractor, and progress bar with a link to the project page.

### 1.2 Project Catalog (Directory & Search)
A searchable directory utilizing infinite scrolling or fast pagination.
- **Facet Search**: Users can search by project name, contractor, ID, or keywords.
- **Advanced Filters**: Filter by year funded, sector (e.g. Irrigation, Machinery), status, budget range, and physical progress.
- **Sort Parameters**: Sort by budget (high to low), completion date, physical progress, and date synced.
- **Exporting Options**: Public users can export filtered lists to CSV or JSON formats.

### 1.3 Project Details Page
The landing node for a specific project showing all its synchronized and user-generated data.
- **Overview Card**: Title, category (AMEFIP/INS), status, implementing agency, sector, and duration.
- **Progress Panel**: Visual indicators for physical progress (%) vs financial disbursement (%).
- **Financial Sheet**: Total budget, contract price, bidding details, and funding year.
- **Location Details**: Exact address, PSGC code, and map view showing exact coordinates.
- **Program of Works (POW) Checklist**: Table listing tasks, targets, actual progress dates, and milestones.
- **Geotagged Photo Gallery**: Slider displaying validation, progress, and completion photos.
- **Documents Download Section**: Scans of validation reports, bidding awards, and KML files.

---

## 2. Citizen Feedback & Engagement Module

Enables public participation through structured feedback and reviews.

### 2.1 Feedback Submission Workflow
- **Form Validation**: Zod-validated client-side form requiring rating (1-5), category (`'quality' | 'progress' | 'transparency' | 'general'`), and comment text.
- **Media Uploads**: Citizens can attach up to 3 geotagged photos or short videos. The system automatically reads GPS metadata from the images to verify they match the project's actual coordinates.
- **Anonymity Option**: Citizens can check "Submit as Anonymous" to hide their profile name from public view (moderators can still see the uploader for accountability).
- **Abuse Prevention**: Rate-limited to 1 submission per project per user every 24 hours.

### 2.2 Engagement (Helpful Votes & Comments)
- **Helpful Votes**: Other users can vote on whether feedback is helpful/unhelpful, pushing highly rated feedback to the top.
- **Comment Threads**: Allows discussions under feedback entries, enabling citizens and municipal officials to converse directly.

---

## 3. Citizen Issue Reporting System

A system for reporting structural anomalies or construction delays directly.

```
Citizen files issue report with photos & coordinates
                    │
                    ▼
           Set status = 'Pending'
                    │
                    ▼
Notify Moderator (Scoped to municipality)
                    │
                    ▼
Moderator changes status to 'Investigating'
           & posts official updates
                    │
                    ▼
Issue resolved → Set status = 'Resolved'
                    │
                    ▼
   In-app/Email notification sent to reporter
```

- **Coordinates Extractor**: If the citizen uploads a photo taken at the site, the site attempts to auto-extract GPS coordinates for accuracy.
- **Issue Progression Tracker**: Standard status transitions: `pending` ──► `investigating` ──► `resolved` / `closed`.
- **Public Timeline**: A chronological log of official responses and progress updates posted by investigators.

---

## 4. Back-Office Management Dashboard

The administrative panel for authorized officers.

### 4.1 Analytics Dashboard
Provides aggregate insights into project efficiency:
- **KPI Summary Cards**: Total budget managed, active projects, overall completion rate, and count of open citizen issues.
- **Sector Analysis Chart**: A breakdown of budget distribution across sectors (Irrigation, Machinery, Equipment, Facilities, Local Infrastructures).
- **Physical vs Financial Burn Rate**: Scatter or bar charts comparing physical progress to financial disbursement to spot anomalies.
- **Municipal Leaderboard**: Ranks municipalities by completed vs suspended ratios.

### 4.2 Content Moderation System
- **Feedback Queue**: Table of pending feedback entries. Moderators can approve, reject (requiring a reason), or flag for Super Admin attention.
- **Comments Moderation**: Automatic regex scanning for profanity. If flagged, comments enter a quarantine list for manual review.

### 4.3 Data Synchronization Engine
- **Dashboard Console**: Manual sync triggers for AMEFIP/INS database runs.
- **Live Logs Console**: Displays active sync status, count of processed files, and system warnings.
- **Sync History**: Historical table of sync operations with options to rollback or re-sync specific IDs.
