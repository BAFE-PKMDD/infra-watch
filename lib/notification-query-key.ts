export function notificationQueryKey(userId: string | null | undefined) {
  return ["notifications", userId ?? "anonymous"] as const;
}
