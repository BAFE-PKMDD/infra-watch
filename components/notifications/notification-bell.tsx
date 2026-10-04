"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/providers/notification-provider";

interface NotificationBellProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationBell({ open: controlledOpen, onOpenChange }: NotificationBellProps = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const open = controlledOpen ?? uncontrolledOpen;
  const containerRef = useRef<HTMLDivElement>(null);

  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  // Closes the panel on any outside interaction (e.g. opening the AI
  // assistant widget) so it doesn't linger on top of other floating UI.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-4 top-[4.5rem] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <CheckCheck className="size-3.5" />
                Read all
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 8).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markAsRead(notification.id)}
                  className="block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <div className="flex gap-3">
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${notification.isRead ? "bg-slate-300" : "bg-sky-500"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{notification.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                      {notification.createdAt && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
