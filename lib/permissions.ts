import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
  user: ["ban", "list", "create", "read", "update", "impersonate", "set-role", "delete", "set-password", "revoke"],
  projects: ["create", "read", "update", "delete", "list", "publish", "archive"],
  project_status: ["update", "view"],
  project_documents: ["upload", "download", "delete", "view"],
  feedback: ["create", "read", "update", "delete", "list", "approve", "reject", "flag", "respond"],
  issues: ["create", "read", "update", "delete", "list", "respond", "resolve"],
  articles: ["create", "read", "update", "delete", "publish", "unpublish", "list"],
  announcements: ["create", "read", "update", "delete", "publish", "unpublish", "list"],
  uploads: ["create", "read", "delete", "moderate"],
  contact_messages: ["read", "update", "delete", "list"],
  dashboard: ["view", "export"],
  analytics: ["view", "export"],
  reports: ["generate", "view", "export", "schedule"],
  abemis_sync: ["trigger", "view", "configure"],
  audit_logs: ["view", "export", "delete"],
  system_settings: ["read", "update"],
} as const;

export const ac = createAccessControl(statement);

export const availableRoles = ["admin", "moderator", "citizen"] as const;
export type UserRole = (typeof availableRoles)[number];

export const citizen = ac.newRole({
  projects: ["read", "list"],
  project_status: ["view"],
  project_documents: ["view", "download"],
  feedback: ["create", "read", "list"],
  issues: ["create", "read", "list"],
  articles: ["read", "list"],
  announcements: ["read", "list"],
  uploads: ["create", "read"],
});

export const moderator = ac.newRole({
  projects: ["read", "update", "list"],
  project_status: ["update", "view"],
  project_documents: ["upload", "download", "delete", "view"],
  feedback: ["create", "read", "update", "delete", "list", "approve", "reject", "flag", "respond"],
  issues: ["read", "update", "delete", "list", "respond", "resolve"],
  articles: ["create", "read", "update", "delete", "publish", "unpublish", "list"],
  announcements: ["create", "read", "update", "delete", "publish", "unpublish", "list"],
  uploads: ["create", "read", "delete", "moderate"],
  contact_messages: ["read", "update", "delete", "list"],
  dashboard: ["view"],
  analytics: ["view"],
  reports: ["generate", "view", "export"],
  abemis_sync: ["view"],
  audit_logs: ["view"],
});

export const admin = ac.newRole({
  user: ["ban", "list", "create", "read", "update", "impersonate", "set-role", "delete", "set-password", "revoke"],
  projects: ["create", "read", "update", "delete", "list", "publish", "archive"],
  project_status: ["update", "view"],
  project_documents: ["upload", "download", "delete", "view"],
  feedback: ["create", "read", "update", "delete", "list", "approve", "reject", "flag", "respond"],
  issues: ["create", "read", "update", "delete", "list", "respond", "resolve"],
  articles: ["create", "read", "update", "delete", "publish", "unpublish", "list"],
  announcements: ["create", "read", "update", "delete", "publish", "unpublish", "list"],
  uploads: ["create", "read", "delete", "moderate"],
  contact_messages: ["read", "update", "delete", "list"],
  dashboard: ["view", "export"],
  analytics: ["view", "export"],
  reports: ["generate", "view", "export", "schedule"],
  abemis_sync: ["trigger", "view", "configure"],
  audit_logs: ["view", "export", "delete"],
  system_settings: ["read", "update"],
});

const roleRegistry = {
  admin,
  moderator,
  citizen,
} as const;

type Statement = typeof statement;
type Resource = keyof Statement;
type ActionFor<R extends Resource> = Statement[R][number];

export function hasPermission<R extends Resource>(
  roleInput: string | string[] | null | undefined,
  resource: R,
  action: ActionFor<R>,
): boolean {
  if (!roleInput) {
    return false;
  }

  const roles = Array.isArray(roleInput) ? roleInput : [roleInput];

  return roles.some((roleName) => {
    const role = roleRegistry[roleName as keyof typeof roleRegistry];
    if (!role) {
      return false;
    }

    const statements = role.statements as Partial<Record<Resource, readonly ActionFor<Resource>[]>>;
    const allowedActions = statements[resource] as readonly ActionFor<R>[] | undefined;
    return Boolean(allowedActions?.includes(action));
  });
}

export function requirePermission<R extends Resource>(
  roleInput: string | string[] | null | undefined,
  resource: R,
  action: ActionFor<R>,
) {
  if (hasPermission(roleInput, resource, action)) {
    return;
  }

  const error = new Error("You do not have permission to perform this action.");
  (error as Error & { status?: number }).status = 403;
  throw error;
}