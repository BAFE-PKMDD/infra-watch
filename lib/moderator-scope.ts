// Pure, dependency-free scope helpers — no `@/lib/db` import, so client components
// (e.g. the admin sidebar) can use hasAssignedModeratorScope without pulling the
// `postgres` driver (and its Node-only `fs` import) into the browser bundle.
// lib/scope.ts re-exports these for existing server-side callers.

export type ScopedUser = {
  role?: string | null;
  region?: string | null;
  assignedAgency?: string | null;
};

export function normalizedAssignment(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function hasAssignedModeratorScope(user: ScopedUser) {
  return user.role !== "moderator" || Boolean(
    normalizedAssignment(user.region) || normalizedAssignment(user.assignedAgency),
  );
}

// Used to scope a regional admin's user-management access to staff in their own
// region — never true when either side has no region assigned.
export function isSameRegion(a: string | null | undefined, b: string | null | undefined) {
  const normalizedA = normalizedAssignment(a);
  const normalizedB = normalizedAssignment(b);
  return normalizedA !== null && normalizedA === normalizedB;
}
