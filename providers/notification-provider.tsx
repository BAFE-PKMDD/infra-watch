"use client";

import { createContext, useCallback, useContext, ReactNode, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationQueryKey } from "@/lib/notification-query-key";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

interface Notification {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  isRead?: boolean;
  readAt?: Date | string | null;
  createdAt?: Date | string;
}
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Use auth context instead of useSession

  // Only fetch if user is logged in
  const isLoggedIn = !!user;
  const notificationKey = useMemo(
    () => notificationQueryKey(user?.id),
    [user?.id],
  );

  // Initial fetch of durable notifications scoped to the signed-in recipient.
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch,
  } = useQuery({
    queryKey: notificationKey,
    queryFn: async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const result = await response.json();
      return (result.data || []) as Notification[];
    },
    enabled: isLoggedIn,
    staleTime: 30000,
  });

  const unreadCount = useMemo(
    () => (notificationsData || []).filter((notification) => !notification.isRead).length,
    [notificationsData],
  );

  const handleIncomingNotification = useCallback((notification: Notification) => {
    const currentNotifications = queryClient.getQueryData<Notification[]>(notificationKey) || [];
    const deduplicationKey = `${notification.type}:${String(
      notification.metadata?.feedbackId ||
      notification.metadata?.issueId ||
      notification.metadata?.ticketNumber ||
      notification.id
    )}`;
    const isDuplicate = currentNotifications.some((item) => {
      const itemKey = `${item.type}:${String(
        item.metadata?.feedbackId ||
        item.metadata?.issueId ||
        item.metadata?.ticketNumber ||
        item.id
      )}`;
      return itemKey === deduplicationKey;
    });

    if (isDuplicate) return;

    queryClient.setQueryData<Notification[]>(notificationKey, (current = []) => {
      return [notification, ...current].slice(0, 50);
    });

    queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
    queryClient.invalidateQueries({ queryKey: ["admin-feedback-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-issues"] });
    queryClient.invalidateQueries({ queryKey: ["admin-issue-stats"] });
    queryClient.invalidateQueries({ queryKey: ["public-issues"] });

    toast.info(notification.title, {
      description: notification.message,
      duration: 6000,
    });
  }, [notificationKey, queryClient]);

  // Setup SSE connection for realtime feedback/E-Report notifications.
  useEffect(() => {
    if (!isLoggedIn) return;

    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("notification", (event) => {
      const notification = JSON.parse((event as MessageEvent).data) as Notification;
      handleIncomingNotification(notification);
    });

    source.onerror = () => {
      queryClient.invalidateQueries({ queryKey: notificationKey });
    };

    return () => {
      source.close();
    };
  }, [handleIncomingNotification, isLoggedIn, notificationKey, queryClient]);

  useEffect(() => {
    const listener = (event: Event) => {
      handleIncomingNotification((event as CustomEvent<Notification>).detail);
    };

    window.addEventListener("infra-watch-notification", listener);
    return () => window.removeEventListener("infra-watch-notification", listener);
  }, [handleIncomingNotification]);


  // Mark notification as read mutation
  const persistRead = useCallback(
    async (payload: { id?: string; all?: boolean }) => {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to persist notification read state");
      }
    },
    [],
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      queryClient.setQueryData<Notification[]>(notificationKey, (current = []) =>
        current.map((notification) =>
          notification.id === notificationId && !notification.isRead
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification,
        ),
      );
      try {
        await persistRead({ id: notificationId });
      } catch {
        await queryClient.invalidateQueries({ queryKey: notificationKey });
        toast.error("Could not update the notification. Please try again.");
      }
    },
    [notificationKey, persistRead, queryClient],
  );

  const markAllAsRead = useCallback(async () => {
    queryClient.setQueryData<Notification[]>(notificationKey, (current = []) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt || new Date().toISOString(),
      })),
    );
    try {
      await persistRead({ all: true });
    } catch {
      await queryClient.invalidateQueries({ queryKey: notificationKey });
      toast.error("Could not update notifications. Please try again.");
    }
  }, [notificationKey, persistRead, queryClient]);

  const value: NotificationContextValue = {
    notifications: notificationsData || [],
    unreadCount,
    isLoading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}

