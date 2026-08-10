# GeoVideo Report — Integration Plan

> **Goal**: All evidence (photos and videos) attached to issue reports must include location/coordinates. GPS data is extracted automatically from uploaded files, or captured via browser geolocation when using the camera. Furthermore, a designated map will plot all reported geotagged evidence system-wide.

---

## 1. Existing Stack Reference

| Layer      | Tech                                                |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router)                             |
| UI         | Tailwind v4 + shadcn + Lucide + Framer Motion       |
| Map        | Leaflet 1.9.4 + react-leaflet 5 (already installed) |
| DB         | PostgreSQL + Drizzle ORM + PostGIS                  |
| Storage    | MinIO (S3-compatible, existing `uploadFile` helper) |
| Auth       | better-auth                                         |
| Validation | Zod, existing upload-validation pipeline            |

---

## 2. How Location Is Captured (3 Sources)

| Source                             | Media Type     | How GPS Is Obtained                                          |
| ---------------------------------- | -------------- | ------------------------------------------------------------ |
| **Uploaded video** (from device)   | MP4/MOV        | Extract from MP4 binary metadata (©xyz atom, embedded text)  |
| **Uploaded photo** (from device)   | JPG/PNG        | Extract from EXIF metadata (GPSLatitude, GPSLongitude)       |
| **Captured live** (browser camera) | Photo or Video | `navigator.geolocation.getCurrentPosition()` at capture time |

All 3 sources produce the same output: `{ lat, lon }` coordinates stored per evidence item.

---

## 3. End-to-End Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    REPORT ISSUE FORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │  📷 Take Photo      │    │  📁 Upload File     │        │
│  │  (browser camera)   │    │  (photo or video)   │        │
│  └────────┬────────────┘    └────────┬────────────┘        │
│           │                          │                      │
│           ▼                          ▼                      │
│  navigator.geolocation       Client-side extraction         │
│  .getCurrentPosition()       • EXIF for photos              │
│                              • MP4 metadata for videos      │
│           │                          │                      │
│           └──────────┬───────────────┘                      │
│                      ▼                                      │
│           ┌──────────────────────┐                          │
│           │ 📍 Map Preview       │                          │
│           │ Shows pin/track on   │                          │
│           │ Leaflet mini-map     │                          │
│           └──────────────────────┘                          │
│                      │                                      │
│               Submit Form                                   │
└──────────────────────┼──────────────────────────────────────┘
                       ▼
              ┌──────────────────┐
              │ POST /api/issues │
              │ • file → MinIO   │
              │ • coords → DB    │
              │ • track → DB     │
              └──────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
 View Issue Detail          System-Wide Evidence Map
```

---

## 4. Database Changes

**File**: `lib/db/schema.ts`

### 4.1 Update `evidence` JSONB type on `issues` table

Expand the evidence item type to include optional coordinates:

```ts
// BEFORE
evidence: jsonb("evidence")
  .$type<Array<{
    type: "image" | "video" | "document";
    url: string;
    name?: string;
  }>>()
  .default([]),

// AFTER
evidence: jsonb("evidence")
  .$type<Array<{
    type: "image" | "video" | "document";
    url: string;
    name?: string;
    lat?: number;
    lon?: number;
    accuracy?: number;
  }>>()
  .default([]),
```

### 4.2 Add new columns for GeoVideo track

```ts
// Add after the `evidence` column
geoVideoTrack: jsonb("geo_video_track")
  .$type<Array<{ lat: number; lon: number; accuracy?: number }>>(),

geoVideoUrl: text("geo_video_url"),
```

| Column               | Type             | Purpose                                      |
| -------------------- | ---------------- | -------------------------------------------- |
| `evidence[].lat/lon` | JSONB (per item) | Single-point location for each photo/video   |
| `geoVideoTrack`      | JSONB            | Array of GPS points for video route playback |
| `geoVideoUrl`        | TEXT             | Direct MinIO path to the geo-video file      |

### 4.3 Update `media` JSONB type on `feedback` table

Same expansion for feedback media (if you want location on feedback evidence too):

```ts
// BEFORE
media: jsonb("media")
  .$type<Array<{ type: "image" | "video"; url: string; caption?: string }>>()
  .default([]),

// AFTER
media: jsonb("media")
  .$type<Array<{
    type: "image" | "video";
    url: string;
    caption?: string;
    lat?: number;
    lon?: number;
  }>>()
  .default([]),
```

> **Note**: All new fields are optional. No migration needed for the JSONB type changes — they're TypeScript-only. Only `geoVideoTrack` and `geoVideoUrl` columns need a migration.

**Migration commands**:

```bash
npm run db:generate
npm run db:migrate
```

---

## 5. New Files

### 5.1 GPS Extraction Utility — Videos

**File**: `lib/geo-video-parser.ts`

Pure client-side module. Reads an MP4 file's binary content and extracts GPS coordinates.

| Strategy       | Pattern                         | Source                     |
| -------------- | ------------------------------- | -------------------------- |
| 1. Text match  | `Lat XX.XX \| Lon YY.YY`        | Phone/dashcam overlay text |
| 2. ©xyz atom   | `+DD.DDDD+DDD.DDDD/` (ISO 6709) | Standard MP4 location atom |
| 3. Brute-force | Regex on ASCII-filtered binary  | Fallback                   |

```ts
export interface GeoTrackPoint {
  lat: number;
  lon: number;
  accuracy?: number;
}

export interface GeoExtractionResult {
  track: GeoTrackPoint[];
  hasGeoData: boolean;
}

export function extractGPSFromVideoFile(
  file: File,
): Promise<GeoExtractionResult>;
```

---

### 5.2 GPS Extraction Utility — Photos (EXIF)

**File**: `lib/geo-photo-parser.ts`

Pure client-side module. Reads EXIF GPS data from JPEG/TIFF images.

```ts
export interface GeoPhotoResult {
  lat: number | null;
  lon: number | null;
  hasGeoData: boolean;
}

export function extractGPSFromPhoto(file: File): Promise<GeoPhotoResult>;
```

**How it works**:

- Reads first ~128KB of the file as `ArrayBuffer`
- Parses EXIF IFD0 → GPS IFD
- Extracts `GPSLatitude`, `GPSLatitudeRef`, `GPSLongitude`, `GPSLongitudeRef`
- Converts DMS (degrees/minutes/seconds) → decimal degrees
- No external library needed (~100 lines of code)

---

### 5.3 Browser Geolocation Capture Hook

**File**: `hooks/use-geolocation.ts`

React hook wrapping `navigator.geolocation`:

```ts
export interface GeoPosition {
  lat: number;
  lon: number;
  accuracy: number;
}

export function useGeolocation(): {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  capture: () => Promise<GeoPosition>;
};
```

- `capture()` calls `navigator.geolocation.getCurrentPosition()`
- Returns a promise with `{ lat, lon, accuracy }`
- Handles permission denied, timeout, and unavailable errors gracefully
- Used when the user takes a photo or records a video via the browser camera

---

### 5.4 Evidence Upload Component (Unified)

**File**: `components/shared/geo-evidence-upload.tsx`

`"use client"` component that replaces/enhances the existing evidence upload section. Two modes:

#### Mode A: Upload from Device

1. User selects a file (photo or video)
2. Component detects file type:
   - **Photo** → calls `extractGPSFromPhoto()` from EXIF parser
   - **Video** → calls `extractGPSFromVideoFile()` from video parser
3. Shows result:
   - ✅ GPS found → mini map preview with pin/track
   - ⚠️ No GPS → warning badge, file still accepted

#### Mode B: Capture with Camera

1. User clicks "Take Photo" or "Record Video"
2. Opens `navigator.mediaDevices.getUserMedia()` for camera access
3. Simultaneously calls `useGeolocation().capture()` to get current position
4. On capture:
   - Photo → saved as blob + coordinates attached
   - Video → `MediaRecorder` saves blob + coordinates attached as single point

**Callback**:

```ts
interface GeoEvidenceUploadProps {
  onEvidenceReady: (
    items: Array<{
      file: File;
      type: "image" | "video";
      lat: number | null;
      lon: number | null;
      accuracy?: number;
      track?: GeoTrackPoint[]; // only for geotagged videos
    }>,
  ) => void;
  maxFiles?: number;
}
```

---

### 5.5 GeoVideo Playback Component

**File**: `components/shared/geo-video-player.tsx`

Same as before — split video+map viewer with synced marker for issue detail pages.

```
┌─────────────────────┬─────────────────────┐
│   Video Player      │   Leaflet Map       │
│   (with controls)   │   ● moving marker   │
│                     │   ── track polyline  │
├─────────────────────┼─────────────────────┤
│  filename.mp4       │  Lat / Lon / %      │
└─────────────────────┴─────────────────────┘
```

---

### 5.6 Evidence Location Map Component

**File**: `components/shared/evidence-location-map.tsx`

`"use client"` component for issue detail pages. Shows all evidence items with locations as pins on a single Leaflet map.

```
┌──────────────────────────────────┐
│         📍 Evidence Locations    │
│  ┌────────────────────────────┐  │
│  │        Leaflet Map         │  │
│  │   📷 ← photo pin          │  │
│  │   📷 ← photo pin          │  │
│  │   🎬── video track         │  │
│  └────────────────────────────┘  │
│  Click a pin to see the evidence │
└──────────────────────────────────┘
```

- Photo evidence → single marker pin with photo thumbnail popup
- Video evidence with track → polyline + start/end markers
- Clicking a pin scrolls to / highlights the evidence item in the gallery

---

### 5.7 Designated System-Wide Evidence Map Page (NEW)

**File**: `app/(public)/evidence-map/page.tsx`

A new page dedicated entirely to visualizing reported evidence geographically across the entire system.

- Displays a large, full-screen (or near full-screen) Leaflet map.
- Fetches all issues that have coordinates in their `evidence` array or `geoVideoTrack`.
- Plots markers for every geotagged photo and polylines/markers for every geotagged video.
- Includes a sidebar/HUD (similar to your existing `GISMapCanvas` page) for filtering evidence by:
  - Date reported
  - Issue Category (e.g., Road, Bridge)
  - Issue Status (Pending, Resolved)
  - Media Type (Photos only, Videos only, Both)
- Clicking a marker on the map opens a popup with the photo/video thumbnail, description snippet, and a link to the full Issue Detail page.

---

## 6. Modified Files

### 6.1 Report Issue Form

**File**: `app/(public)/report-issue/new/page.tsx`

- Replace existing photo-only evidence section with `<GeoEvidenceUpload>` component
- Accept both photos and videos
- Each evidence item now carries `{ file, type, lat, lon, track? }`
- On submit:
  1. Upload each file to MinIO via `/api/upload?folder=issue-evidence`
  2. Build `evidence[]` with `{ type, url, lat, lon }`
  3. If any video has a GPS track → set `geoVideoTrack` and `geoVideoUrl`

---

### 6.2 Issues API Route

**File**: `app/api/issues/route.ts`

- Accept `evidence[].lat`, `evidence[].lon` in evidence items
- Accept `geoVideoTrack` and `geoVideoUrl`
- Validate coordinates with Zod
- Store in DB

**File**: `app/api/evidence/route.ts` (NEW)

- Endpoint to query and return just the geotagged evidence data (to power the new System-Wide Evidence Map without returning unnecessary full issue payloads).

---

### 6.3 Issue Detail Pages

**Files**:

- `app/(admin)/issues/[id]/page.tsx`
- `app/(citizen)/my-issues/[id]/page.tsx`

- Render `<EvidenceLocationMap>` showing all evidence pins on one map
- If issue has `geoVideoTrack` + `geoVideoUrl` → render `<GeoVideoPlayer>`
- Each photo/video evidence item shows its coordinates as a small badge

---

## 7. File Change Summary

| Action | File                                          | What Changes                                   |
| ------ | --------------------------------------------- | ---------------------------------------------- |
| MODIFY | `lib/db/schema.ts`                            | Expand `evidence` type + add 2 new columns     |
| NEW    | `lib/geo-video-parser.ts`                     | Client-side MP4 GPS extraction                 |
| NEW    | `lib/geo-photo-parser.ts`                     | Client-side EXIF GPS extraction                |
| NEW    | `hooks/use-geolocation.ts`                    | Browser geolocation capture hook               |
| NEW    | `components/shared/geo-evidence-upload.tsx`   | Unified evidence upload with GPS               |
| NEW    | `components/shared/geo-video-player.tsx`      | Split video + map playback                     |
| NEW    | `components/shared/evidence-location-map.tsx` | All-evidence pins on one map                   |
| NEW    | `app/(public)/evidence-map/page.tsx`          | System-wide map view of all geotagged evidence |
| NEW    | `app/api/evidence/route.ts`                   | Endpoint serving geotagged evidence data       |
| MODIFY | `app/(public)/report-issue/new/page.tsx`      | Use new evidence upload component              |
| MODIFY | `app/api/issues/route.ts`                     | Accept + store coordinates                     |
| MODIFY | `app/(admin)/issues/[id]/page.tsx`            | Render location map + geo player               |
| MODIFY | `app/(citizen)/my-issues/[id]/page.tsx`       | Render location map + geo player               |

---

## 8. Design Decisions

### Why client-side extraction?

- No server dependency (no ffmpeg/exiftool needed)
- Instant feedback — user sees the map preview before submitting
- Reduces server load — only JSON coordinates get sent to the API

### Why store coordinates per evidence item in JSONB?

- Each photo/video can have a different location
- No schema migration needed for JSONB field changes
- Easy to render as individual map pins

### Why a separate `geoVideoTrack` column?

- A video track is an array of points (route), not a single point
- Enables the synced video+map playback feature
- Makes querying "issues with geovideo" trivial: `WHERE geo_video_url IS NOT NULL`

### Why `navigator.geolocation` for camera capture?

- Browser `MediaRecorder` API cannot embed GPS into recorded video files
- Capturing location separately and storing it alongside the media is the standard approach
- Works on all modern mobile browsers (Chrome, Safari, Firefox)

---

## 9. Browser API Requirements

| API                                          | Purpose                                | Browser Support                                      |
| -------------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| `FileReader.readAsArrayBuffer()`             | Read uploaded files for GPS extraction | All modern browsers ✅                               |
| `navigator.mediaDevices.getUserMedia()`      | Access camera for photo/video capture  | All modern browsers ✅ (requires HTTPS)              |
| `navigator.geolocation.getCurrentPosition()` | Get device GPS coordinates             | All modern browsers ✅ (requires HTTPS + permission) |
| `MediaRecorder`                              | Record video from camera stream        | All modern browsers ✅                               |

> **Important**: Camera and geolocation APIs require HTTPS in production. `localhost` works for development.

---

## 10. Considerations

### Video Size

Current `MAX_VIDEO_SIZE` is **50MB**, but will be updated to **100MB** to accommodate geotagged videos.

- Update `MAX_VIDEO_SIZE` constants in the upload route and validation logic to 100MB (`100 * 1024 * 1024`).

### Geolocation Permission

- Browser will prompt user for location permission on first use
- If denied → evidence is accepted without coordinates, with a warning badge
- Never block the report submission due to missing GPS

### Photo EXIF Availability

- Photos taken with location enabled → GPS in EXIF ✅
- Screenshots, edited photos, photos with location off → no GPS
- Fallback: prompt user to allow browser geolocation as alternative

---

## 11. Verification Checklist

- [ ] Run `db:generate` + `db:migrate` — no errors, existing data intact
- [ ] Upload `Philippines_Geotagged_GIS_Test.mp4` → 10 track points extracted, map preview shown
- [ ] Upload a geotagged photo → lat/lon extracted from EXIF, pin shown on map
- [ ] Take a photo via browser camera → geolocation captured, pin shown on map
- [ ] Upload a file with no GPS → warning shown, file still accepted
- [ ] Submit issue → files in MinIO, coordinates in DB
- [ ] Issue detail page → evidence location map shows all pins
- [ ] Issue detail page → GeoVideo split player works, marker syncs
- [ ] Designated Evidence Map → shows markers for all reported photos and videos globally
- [ ] Mobile responsive — all components stack vertically
- [ ] Location permission denied → graceful fallback, no crash

---

## 12. Future Enhancements (Out of Scope)

- Show geovideo markers on the admin GIS Map Canvas with distinct icons
- Server-side GPS embedding into recorded videos via ffmpeg
- Heatmap view of all report locations across the system
- Reverse geocoding: auto-fill address fields from GPS coordinates
