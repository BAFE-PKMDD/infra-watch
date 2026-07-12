"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleAlert, FolderKanban, LayoutDashboard, MessageSquare, RefreshCw, ScrollText, Users } from "lucide-react";

import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, resource: "dashboard", action: "view" },
  { label: "Projects", href: "/admin-projects", icon: FolderKanban, resource: "projects", action: "list" },
  { label: "Feedbacks", href: "/feedbacks", icon: MessageSquare, resource: "feedback", action: "list" },
  { label: "Issues", href: "/issues", icon: CircleAlert, resource: "issues", action: "list" },
  { label: "Sync", href: "/sync", icon: RefreshCw, resource: "abemis_sync", action: "view" },
  { label: "Logs", href: "/audit-logs", icon: ScrollText, resource: "audit_logs", action: "view" },
  { label: "Users", href: "/user-management", icon: Users, resource: "user", action: "list" },
] as const;

type AdminMobileNavProps = {
  role?: string | null;
};

export function AdminMobileNav({ role }: AdminMobileNavProps) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => hasPermission(role, item.resource as never, item.action as never));

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-3 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-950">
      <div className="flex gap-1 overflow-x-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold",
                active ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
