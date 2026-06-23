/**
 * Role definitions for FMR Watch
 */

export type UserRole = "admin" | "moderator" | "citizen";

/**
 * Role descriptions and capabilities
 */
export const ROLE_INFO = {
  admin: {
    label: "Admin",
    description: "Super user with full system access",
    color: "purple",
    capabilities: [
      "Full dashboard access",
      "Moderate photos and feedback",
      "Manage articles & publications",
      "System configuration",
      "User management (create, edit, delete, assign roles)",
      "Trigger ABEMIS data sync",
      "View all logs",
    ],
  },
  moderator: {
    label: "Moderator",
    description: "Content manager without user management access",
    color: "blue",
    capabilities: [
      "Full dashboard access",
      "Moderate photos and feedback",
      "Manage articles & publications (including delete)",
      "View system configuration (read-only)",
      "View ABEMIS sync logs",
      "View system logs",
    ],
  },
  citizen: {
    label: "Citizen",
    description: "Public user who can contribute to the platform",
    color: "green",
    capabilities: [
      "View projects",
      "Submit photos with geotags",
      "Submit feedback and ratings",
      "View own submissions",
    ],
  },
} as const;

/**
 * Check if a role has access to admin dashboard
 */
export function canAccessDashboard(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

/**
 * Check if a role can manage users
 */
export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

/**
 * Check if a role can moderate content (photos/feedback)
 */
export function canModerateContent(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

/**
 * Check if a role can manage articles
 */
export function canManageArticles(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

/**
 * Check if a role can modify system configuration
 */
export function canEditConfiguration(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

/**
 * Check if a role can trigger ABEMIS sync
 */
export function canTriggerSync(role: UserRole | null | undefined): boolean {
  return role === "admin";
}
