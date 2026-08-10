type ClientNotificationInput = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
};

export function dispatchClientNotification(input: ClientNotificationInput) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("infra-watch-notification", {
      detail: {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    }),
  );
}
