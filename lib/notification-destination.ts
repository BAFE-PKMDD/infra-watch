type NotificationLink = { metadata?: Record<string, unknown> | null };

export function getNotificationDestination(notification: NotificationLink, role?: string | null) {
  if (role === "admin" || role === "regional_admin" || role === "moderator") return "/dashboard";
  const projectId = notification.metadata?.projectId;
  return typeof projectId === "string" && projectId ? `/projects/${encodeURIComponent(projectId)}` : null;
}
