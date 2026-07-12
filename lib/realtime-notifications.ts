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
  controller: ReadableStreamDefaultController<Uint8Array>;
};

const encoder = new TextEncoder();
const MAX_HISTORY = 50;

type NotificationStore = {
  clients: Map<string, NotificationClient>;
  history: RealtimeNotification[];
};

declare global {
  // eslint-disable-next-line no-var
  var __infraWatchNotifications: NotificationStore | undefined;
}

const store = globalThis.__infraWatchNotifications ??= {
  clients: new Map<string, NotificationClient>(),
  history: [],
};

function writeSse(controller: ReadableStreamDefaultController<Uint8Array>, event: string, data: unknown) {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

export function subscribeToNotifications(controller: ReadableStreamDefaultController<Uint8Array>) {
  const id = crypto.randomUUID();
  store.clients.set(id, { id, controller });

  writeSse(controller, "connected", { ok: true });
  for (const notification of store.history.slice(0, 10).reverse()) {
    writeSse(controller, "notification", notification);
  }

  return () => {
    store.clients.delete(id);
  };
}

export function getRecentNotifications() {
  return store.history;
}

export function getNotificationClientCount() {
  return store.clients.size;
}

export function publishNotification(input: Omit<RealtimeNotification, "id" | "createdAt" | "isRead">) {
  const notification: RealtimeNotification = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  store.history.unshift(notification);
  store.history.splice(MAX_HISTORY);

  for (const [clientId, client] of store.clients) {
    try {
      writeSse(client.controller, "notification", notification);
    } catch {
      store.clients.delete(clientId);
    }
  }

  return notification;
}
