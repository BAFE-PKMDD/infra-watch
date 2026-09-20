"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleAlert,
  DatabaseZap,
  FileText,
  FolderKanban,
  Home,
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  Radio,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  role?: string | null;
};

const menu = [
  {
    label: "Main",
    items: [
      { label: "Analytics", href: "/dashboard", icon: LayoutDashboard, resource: "analytics", action: "view" },
      { label: "Executive Brief", href: "/executive-brief", icon: FileText, resource: "analytics", action: "view" },
      { label: "Projects", href: "/admin-projects", icon: FolderKanban, resource: "projects", action: "list" },
      { label: "Feedbacks", href: "/feedbacks", icon: MessageSquare, resource: "feedback", action: "list" },
      { label: "Reported Issues", href: "/issues", icon: CircleAlert, resource: "issues", action: "list" },
    ],
  },
  {
    label: "Reports & Analytics",
    // Admin-only regardless of the "reports" permission grant: these queries read across
    // every region/agency with no scope filter, so a region-scoped moderator seeing them
    // would see other regions' response-time data too.
    adminOnly: true,
    items: [
      { label: "Issue Reports", href: "/reports/issues", icon: BarChart3, resource: "reports", action: "view" },
      { label: "Feedback Reports", href: "/reports/feedbacks", icon: BarChart3, resource: "reports", action: "view" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "ABEMIS Sync", href: "/sync", icon: RefreshCw, resource: "abemis_sync", action: "view" },
      { label: "Data Quality", href: "/data-quality", icon: DatabaseZap, resource: "data_quality", action: "view" },
      { label: "Audit Logs", href: "/audit-logs", icon: ScrollText, resource: "audit_logs", action: "view" },
      { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen, resource: "knowledge_base", action: "list" },
      { label: "Live Videos", href: "/live-videos", icon: Radio, resource: "system_settings", action: "read" },
      { label: "User Management", href: "/user-management", icon: Users, resource: "user", action: "list" },
    ],
  },
] as const;

function isEReportPath(pathname: string) {
  return pathname === "/issues" || (pathname.startsWith("/issues/") && !pathname.startsWith("/issues/sms-review"));
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const issuesActive = pathname === "/issues" || pathname.startsWith("/issues/");
  const [issuesOpen, setIssuesOpen] = useState(issuesActive);

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/infra-watch-logo.png"
            alt="INFRA Watch logo"
            width={96}
            height={64}
            className="h-12 w-auto flex-shrink-0 rounded bg-white object-contain"
            unoptimized
          />
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-950 dark:text-white">INFRA WATCH</p>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Admin Console</p>
          </div>
        </Link>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-6 overflow-y-auto p-3">
        {menu.map((category) => {
          if ("adminOnly" in category && category.adminOnly && role !== "admin") return null;
          const visibleItems = category.items.filter((item) => hasPermission(role, item.resource as never, item.action as never));
          if (visibleItems.length === 0) return null;

          return (
            <div key={category.label} className="space-y-2">
              <p className="px-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{category.label}</p>
              <div className="space-y-1.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  if (item.href === "/issues") {
                    return (
                      <div key={item.href}>
                        <button
                          type="button"
                          aria-expanded={issuesOpen}
                          aria-controls="desktop-reported-issues-menu"
                          onClick={() => setIssuesOpen((open) => !open)}
                          className={cn(
                            "flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 py-3 text-left text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            issuesActive
                              ? "bg-indigo-50 font-semibold text-primary dark:bg-indigo-950/40"
                              : "text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900",
                          )}
                        >
                          <Icon aria-hidden="true" className="size-5" />
                          <span className="flex-1">Reported Issues</span>
                          <ChevronDown aria-hidden="true" className={cn("size-4", issuesOpen && "rotate-180")} />
                        </button>
                        {issuesOpen && (
                          <div id="desktop-reported-issues-menu" className="mt-1 space-y-1 border-l border-slate-300 pl-4 dark:border-slate-700">
                            <Link
                              href="/issues"
                              aria-current={isEReportPath(pathname) ? "page" : undefined}
                              className={cn(
                                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                isEReportPath(pathname)
                                  ? "bg-primary text-white"
                                  : "text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900",
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
                                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                  pathname.startsWith("/issues/sms-review")
                                    ? "bg-primary text-white"
                                    : "text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900",
                                )}
                              >
                                <MessageSquareText aria-hidden="true" className="size-4" />
                                SMS Grievance
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-3 text-[15px] font-medium transition-colors motion-reduce:transition-none",
                        active
                          ? "bg-primary font-semibold text-white"
                          : "text-slate-700 hover:translate-x-0.5 hover:bg-slate-100 hover:text-primary motion-reduce:hover:translate-x-0 dark:text-slate-200 dark:hover:bg-slate-900",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-3 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <Home aria-hidden="true" className="size-5" />
          Public Portal
        </Link>
        <div className="mt-2 flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
          {role ?? "staff"} access
        </div>
      </div>
    </aside>
  );
}
