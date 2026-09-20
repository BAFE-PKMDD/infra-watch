"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleAlert,
  DatabaseZap,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  Radio,
  RefreshCw,
  ScrollText,
  Users,
} from "lucide-react";

import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const items = [
  { label: "Analytics", href: "/dashboard", icon: LayoutDashboard, resource: "analytics", action: "view" },
  { label: "Brief", href: "/executive-brief", icon: FileText, resource: "analytics", action: "view" },
  { label: "Projects", href: "/admin-projects", icon: FolderKanban, resource: "projects", action: "list" },
  { label: "Feedbacks", href: "/feedbacks", icon: MessageSquare, resource: "feedback", action: "list" },
  { label: "Reported Issues", href: "/issues", icon: CircleAlert, resource: "issues", action: "list" },
  // Admin-only: unscoped across every region/agency, see admin-sidebar.tsx for why.
  { label: "Issue Reports", href: "/reports/issues", icon: BarChart3, resource: "reports", action: "view", adminOnly: true },
  { label: "Feedback Reports", href: "/reports/feedbacks", icon: BarChart3, resource: "reports", action: "view", adminOnly: true },
  { label: "Sync", href: "/sync", icon: RefreshCw, resource: "abemis_sync", action: "view" },
  { label: "Quality", href: "/data-quality", icon: DatabaseZap, resource: "data_quality", action: "view" },
  { label: "Logs", href: "/audit-logs", icon: ScrollText, resource: "audit_logs", action: "view" },
  { label: "Live", href: "/live-videos", icon: Radio, resource: "system_settings", action: "read" },
  { label: "Users", href: "/user-management", icon: Users, resource: "user", action: "list" },
] as const;

type AdminMobileNavProps = {
  role?: string | null;
};

function isEReportPath(pathname: string) {
  return pathname === "/issues" || (pathname.startsWith("/issues/") && !pathname.startsWith("/issues/sms-review"));
}

export function AdminMobileNav({ role }: AdminMobileNavProps) {
  const pathname = usePathname();
  const issuesActive = pathname === "/issues" || pathname.startsWith("/issues/");
  const [issuesOpen, setIssuesOpen] = useState(issuesActive);
  const visibleItems = items.filter(
    (item) =>
      hasPermission(role, item.resource as never, item.action as never) &&
      (!("adminOnly" in item && item.adminOnly) || role === "admin"),
  );
  const canViewIssues = visibleItems.some((item) => item.href === "/issues");

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-3 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-950">
      <nav aria-label="Admin navigation">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            if (item.href === "/issues") {
              return (
                <button
                  key={item.href}
                  type="button"
                  aria-expanded={issuesOpen}
                  aria-controls="mobile-reported-issues-menu"
                  onClick={() => setIssuesOpen((open) => !open)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    issuesActive ? "bg-indigo-50 text-primary dark:bg-indigo-950/40" : "text-slate-700 dark:text-slate-200",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  Reported Issues
                  <ChevronDown aria-hidden="true" className={cn("size-4", issuesOpen && "rotate-180")} />
                </button>
              );
            }

            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {canViewIssues && issuesOpen && (
          <div id="mobile-reported-issues-menu" className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-2 sm:grid-cols-2 dark:border-slate-800">
            <Link
              href="/issues"
              aria-current={isEReportPath(pathname) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isEReportPath(pathname) ? "bg-primary text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100",
              )}
            >
              <FileText aria-hidden="true" className="size-4" />
              E-Report
            </Link>
            {process.env.NODE_ENV !== "production" && (
              <Link
                href="/issues/sms-review"
                aria-current={pathname.startsWith("/issues/sms-review") ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  pathname.startsWith("/issues/sms-review")
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100",
                )}
              >
                <MessageSquareText aria-hidden="true" className="size-4" />
                SMS Grievance
              </Link>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
