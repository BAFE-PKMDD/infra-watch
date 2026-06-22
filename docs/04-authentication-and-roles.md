# Authentication & Roles

> Authentication implementation using Better Auth and Role-Based Access Control (RBAC) with administrative scoping rules for INFRA Watch.

---

## 1. Authentication Engine: Better Auth

INFRA Watch uses **Better Auth** as its core authentication solution. It is configured to run on the Next.js server, exposing API endpoints under `/api/auth/[...all]`.

### Features Setup
- **Email & Password Authentication**: Standard email and password sign-in and registration flow.
- **Session Management**: Session tokens are stored in cookies (secured with `httpOnly`, `sameSite: 'lax'`, and `secure: true` in production) and cached in Redis for fast validation.
- **Admin/Roles Plugin**: Manages roles for users (`super_admin`, `admin`, `moderator`, `citizen`).

---

## 2. Role Definitions & Permissions Matrix

The portal defines four key roles. In addition to their baseline permission checks, administrative access is controlled via a **municipality-based scoping rule**.

### 2.1 Role Profiles

| Role | Target User | Scoping Rule |
| :--- | :--- | :--- |
| **Super Admin** | BAFE / System Owners | Unscoped (Global Access) |
| **Admin** | Senior Agency Monitoring Officers | Scoped to their assigned Agency |
| **Moderator** | Field Engineers / Local Officers | Scoped to a specific Agency and/or Municipality |
| **Citizen** | Public Users & Residents | Scoped to their own submissions |

---

### 2.2 Permissions Matrix

| Resource / Action | Citizen | Moderator | Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **View Project Directory / Map** | ✅ | ✅ | ✅ | ✅ |
| **Submit Feedback & Photos** | ✅ | ❌ | ❌ | ❌ |
| **Report Infrastructure Issues** | ✅ | ❌ | ❌ | ❌ |
| **Manage Own Submissions** | ✅ | ❌ | ❌ | ❌ |
| **Moderate Feedback & Comments** | ❌ | ✅ (Scoped) | ✅ | ✅ |
| **Resolve Reported Issues** | ❌ | ✅ (Scoped) | ✅ | ✅ |
| **Create/Edit Publications & Articles** | ❌ | ✅ | ✅ | ✅ |
| **Trigger ABEMIS Synchronization** | ❌ | ❌ | ❌ | ✅ |
| **Modify Site Settings** | ❌ | ❌ | ❌ | ✅ |
| **Manage Users & Ban Accounts** | ❌ | ❌ | ❌ | ✅ |
| **View Audit & Sync Logs** | ❌ | ❌ | ✅ | ✅ |

---

## 3. Scoping Rules (Municipality & Agency-based Security)

To support multiple agencies and distribute moderation duties effectively, administrative access is filtered by both **Agency** and **Municipality**.

### 3.1 Agency-Based Scoping (Multi-Agency Readiness)
- Users can have an `assigned_agency` attribute (e.g., `"BAFE"`, `"DPWH"`).
- Moderators and Admins are restricted to managing projects, feedback, and issue reports belonging to their `assigned_agency`.
- A Super Admin has unscoped access to all agencies.

### 3.2 Municipality-Based Scoping
- In addition to agency scoping, Moderators can be assigned to a specific municipality (e.g., `assigned_municipality = "Balamban"`).
- When a moderator queries data or updates status, the backend enforces the scoping rules:
  - **Project Scoping**: A scoped Moderator can only view detailed progress metrics, financial sheets, and internal notes for projects situated in their `assigned_municipality` and `assigned_agency`.
  - **Feedback & Comments Moderation Scoping**: The query automatically filters feedback linked to projects within the moderator's municipality and agency:
    ```sql
    SELECT f.* FROM feedback f
    JOIN projects p ON f.project_id = p.id
    WHERE p.municipality = user.assigned_municipality
      AND p.source_agency = user.assigned_agency;
    ```
  - **Issue Scoping**: Moderators can review and post resolutions only to issues reported within their municipality and linked to their agency.
  - **Notification Scoping**: In-app and email notifications (e.g., when a citizen reports a new irrigation canal damage issue) are only sent to moderators whose `assigned_municipality` matches the issue's location and whose `assigned_agency` matches the project agency.

---

## 4. Auth Utility Code Patterns

### 4.1 Server-Side Session Fetching
To retrieve the current user session in React Server Components or Server Actions:
```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session?.user ?? null;
}
```

### 4.2 Route Permission Check Guard
```typescript
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }
  
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }
  
  return user;
}
```
