# Security Architecture & Audit Response

> Security standards, data privacy compliance, and mitigation plans addressing critical API vulnerabilities for INFRA Watch.

---

## 1. Zero-Vulnerability API Policy

Applying the lessons learned from the December 2025 FMR Watch Security Audit, INFRA Watch implements strict route protection policies from day one.

### 1.1 Critical Vulnerability Fixes Applied
1. **Protected File Uploads (`/api/upload`)**: Standard citizen uploads are authenticated. Guest users cannot upload files. File size limit is capped at 5MB, and file type validation is enforced on the server.
2. **Authenticated GPS Metadata Extraction (`/api/extract-gps`)**: Restricts EXIF parsing tasks to authenticated citizen sessions to prevent server resource abuse.
3. **Restricted Admin Logs (`/api/audit-logs`)**: Super admin authentication required. Audit records cannot be queried by moderators or public users.
4. **Protected Statistics Manipulation (`/api/regional-statistics`)**: Any write operations (POST/PATCH/DELETE) are restricted to super admin users.

---

## 2. API Rate Limiting (Redis-backed)

To prevent Distributed Denial of Service (DDoS) and API abuse, all public routes run through a Redis-backed rate limiting middleware:
- **Public / Guest Visitors**: Max 30 requests per minute per IP address.
- **Authenticated Citizens**: Max 100 requests per minute per user account.
- **Critical Endpoints (Auth, Sign-in, Issue reporting)**: Max 5 attempts per minute to mitigate brute-force and spam.

---

## 3. Data Privacy & EXIF Metadata Handling

### 3.1 Metadata Stripping (Public Protection)
When citizens upload photos for feedback or issue reports, the original image files may contain sensitive GPS EXIF metadata detailing exactly where and when the photo was taken (which could leak their home locations).
1. The server reads the GPS EXIF coordinates to verify project alignment (abuse detection).
2. The image is processed on the server using `sharp` or a similar tool.
3. All EXIF metadata is stripped from the image binary before the file is saved to S3-compatible storage.
4. The public only receives the sanitized image.

### 3.2 Anonymous Submissions
Citizens can choose to submit feedback anonymously. In this state:
- The database still stores the link to the `user_id` for security auditing and accountability.
- The public endpoints strip the `user_id` and name fields, showing `'Anonymous Citizen'` on the frontend.

---

## 4. Input Sanitization & XSS Mitigation

- **Zod Schema Validation**: All incoming requests are validated against strict Zod schemas on the server side.
- **Sanitized Rich Text**: Comments and feedback comments are sanitized on the server before database insertion using a sanitizer library (e.g. `isomorphic-dompurify`) to remove any embedded script or HTML injection attacks.
- **SQL Injection Prevention**: Using Drizzle ORM's parameterized queries ensures SQL injection is mathematically impossible.

---

## 5. GDPR Cookie Consent & Analytics

- **Cookie Consent Banner**: Displayed to first-time visitors with clear options: "Accept All", "Reject Non-Essential", or "Customize".
- **Google Analytics Consent Mode v2**: Tracking cookies are disabled by default. Analytics tracking is only initialized if the user explicitly clicks "Accept All" or turns on analytics cookies in their preferences.
- **Essential Cookies Only**: Authentication cookies are categorized as essential and are always active.
