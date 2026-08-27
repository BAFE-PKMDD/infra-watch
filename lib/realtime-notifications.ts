export type RealtimeNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  isRead?: boolean;
  createdAt: string;
};

type NotificationClient = {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
};

type NotificationStore = {
  clients: Map<string, NotificationClient>;
};

const encoder = new TextEncoder();

declare global {
  var __infraWatchNotifications: NotificationStore | undefined;
}

const store = globalThis.__infraWatchNotifications ??= {
  clients: new Map<string, NotificationClient>(),
};

function writeSse(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown,
) {
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
  );
}

export function subscribeToNotifications(
  userId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  const id = crypto.randomUUID();
  store.clients.set(id, { id, userId, controller });
  writeSse(controller, "connected", { ok: true });

  return () => {
    store.clients.delete(id);
  };
}

export function getNotificationClientCount() {
  return store.clients.size;
}

export function createRealtimeNotification(
  input: Omit<RealtimeNotification, "id" | "createdAt" | "isRead">,
): RealtimeNotification {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    isRead: false,
  };
}

export function broadcastNotification(
  notification: RealtimeNotification,
  recipientUserIds: string[],
) {
  const recipients = new Set(recipientUserIds.filter(Boolean));

  for (const [clientId, client] of store.clients) {
    if (!recipients.has(client.userId)) continue;
    try {
      writeSse(client.controller, "notification", notification);
    } catch {
      store.clients.delete(clientId);
    }
  }

  return notification;
}

export function publishNotification(
  input: Omit<RealtimeNotification, "id" | "createdAt" | "isRead">,
  recipientUserIds: string[],
) {
  return broadcastNotification(
    createRealtimeNotification(input),
    recipientUserIds,
  );
}

export function resetNotificationStoreForTests() {
  if (process.env.NODE_ENV !== "test") return;
  store.clients.clear();
}
