"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleAlert,
  FileText,
  FolderKanban,
  Home,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { hasAssignedModeratorScope } from "@/lib/moderator-scope";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { adminSystemGroups } from "./admin-system-menu";
import {
  SmsAttentionBadge,
  useSmsAttentionCount,
} from "@/components/admin/sms-attention-badge";

type AdminSidebarProps = {
  role?: string | null;
  region?: string | null;
  assignedAgency?: string | null;
};

const menu = [
  {
    label: "Main",
    items: [
      {
        label: "Analytics",
        href: "/dashboard",
        icon: LayoutDashboard,
        resource: "analytics",
        action: "view",
      },
      {
        label: "Executive Brief",
        href: "/executive-brief",
        icon: FileText,
        resource: "analytics",
        action: "view",
      },
      {
        label: "Projects",
        href: "/admin-projects",
        icon: FolderKanban,
        resource: "projects",
        action: "list",
      },
      {
        label: "Feedbacks",
        href: "/feedbacks",
        icon: MessageSquare,
        resource: "feedback",
        action: "list",
      },
      {
        label: "Reported Issues",
        href: "/issues",
        icon: CircleAlert,
        resource: "issues",
        action: "list",
      },
      {
        label: "Contact Messages",
        href: "/contact-messages",
        icon: Inbox,
        resource: "contact_messages",
        action: "list",
      },
    ],
  },
  {
    label: "Reports & Analytics",
    // Admin and regional-admin only, regardless of the "reports" permission grant:
    // these queries read across every region/agency with no scope filter, so a
    // region-scoped moderator seeing them would see other regions' data too — but
    // regional admins are themselves unrestricted by region (see lib/scope.ts).
    roles: ["admin", "regional_admin"],
    items: [
      {
        label: "Issue Reports",
        href: "/reports/issues",
        icon: BarChart3,
        resource: "reports",
        action: "view",
      },
      {
        label: "Feedback Reports",
        href: "/reports/feedbacks",
        icon: BarChart3,
        resource: "reports",
        action: "view",
      },
      {
        label: "Citizen Engagement",
        href: "/reports/citizen-engagement",
        icon: BarChart3,
        resource: "reports",
        action: "view",
      },
      { label: "Contact Reports", href: "/reports/contact", icon: BarChart3, resource: "reports", action: "view" },
    ],
  },
  ...adminSystemGroups,
] as const;

function isEReportPath(pathname: string) {
  return (
    pathname === "/issues" ||
    (pathname.startsWith("/issues/") &&
      !pathname.startsWith("/issues/sms-review"))
  );
}

export function AdminSidebar({
  role,
  region,
  assignedAgency,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const smsAttentionCount = useSmsAttentionCount(
    hasPermission(role, "issues" as never, "list" as never),
  );
  const issuesActive =
    pathname === "/issues" || pathname.startsWith("/issues/");
  const [issuesOpen, setIssuesOpen] = useState(issuesActive);
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>(
    {},
  );
  // A moderator with no region/agency assigned yet gets a 403 from every analytics
  // endpoint (see hasAssignedModeratorScope in lib/scope.ts) — hide the links rather
  // than send them to a page that can only ever show "Forbidden".
  const canViewAnalytics = hasAssignedModeratorScope({
    role,
    region,
    assignedAgency,
  });

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/infra-watch-logo-light.png"
            alt="INFRA Watch logo"
            width={400}
            height={231}
            className="h-12 w-auto flex-shrink-0 object-contain dark:hidden"
            unoptimized
          />
          <Image
            src="/infra-watch-logo-dark.png"
            alt="INFRA Watch logo"
            width={400}
            height={237}
            className="hidden h-12 w-auto flex-shrink-0 object-contain dark:block"
            unoptimized
          />
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-950 dark:text-white">
              INFRA WATCH
            </p>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Admin Console
            </p>
          </div>
        </Link>
      </div>

      <nav
        aria-label="Admin navigation"
        className="flex-1 space-y-6 overflow-y-auto p-3"
      >
        {menu.map((category) => {
          if (
            "roles" in category &&
            category.roles &&
            !(category.roles as readonly string[]).includes(role ?? "")
          )
            return null;
          const visibleItems = category.items.filter(
            (item) =>
              hasPermission(
                role,
                item.resource as never,
                item.action as never,
              ) &&
              (item.resource !== "analytics" || canViewAnalytics) &&
              (!("roles" in item && item.roles) ||
                (item.roles as readonly string[]).includes(role ?? "")),
          );
          if (visibleItems.length === 0) return null;
          const collapsible = "collapsible" in category;
          const active = visibleItems.some(
            (item) =>
              pathname === item.href || pathname.startsWith(`${item.href}/`),
          );
          const overrideKey = `${pathname}:${category.label}`;
          const open = !collapsible || (groupOverrides[overrideKey] ?? active);
          const panelId = `desktop-admin-${"id" in category ? category.id : category.label.replaceAll(" ", "-")}`;

          return (
            <div key={category.label} className="space-y-2">
              {collapsible ? (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() =>
                    setGroupOverrides((current) => ({
                      ...current,
                      [overrideKey]: !open,
                    }))
                  }
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "text-primary"
                      : "text-slate-700 dark:text-slate-200",
                    "hover:bg-slate-100 dark:hover:bg-slate-900",
                  )}
                >
                  {category.label}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-4 shrink-0", open && "rotate-180")}
                  />
                </button>
              ) : (
                <p className="px-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {category.label}
                </p>
              )}
              <div
                id={panelId}
                hidden={!open}
                className={cn(
                  "space-y-1.5",
                  collapsible &&
                    "ml-3 border-l border-slate-200 pl-2 dark:border-slate-800",
                )}
              >
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  if (item.href === "/issues") {
                    return (
                      <div key={item.href}>
                        <button
                          type="button"
                          aria-expanded={issuesOpen}
                          aria-controls="desktop-reported-issues-menu"
                          data-tour-nav="/issues"
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
                          {!issuesOpen && (
                            <SmsAttentionBadge count={smsAttentionCount} />
                          )}
                          <ChevronDown
                            aria-hidden="true"
                            className={cn("size-4", issuesOpen && "rotate-180")}
                          />
                        </button>
                        {issuesOpen && (
                          <div
                            id="desktop-reported-issues-menu"
                            className="mt-1 space-y-1 border-l border-slate-300 pl-4 dark:border-slate-700"
                          >
                            <Link
                              href="/issues"
                              aria-current={
                                isEReportPath(pathname) ? "page" : undefined
                              }
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
                            <Link
                              href="/issues/sms-review"
                              aria-current={
                                pathname.startsWith("/issues/sms-review")
                                  ? "page"
                                  : undefined
                              }
                              className={cn(
                                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                pathname.startsWith("/issues/sms-review")
                                  ? "bg-primary text-white"
                                  : "text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900",
                              )}
                            >
                              <MessageSquareText
                                aria-hidden="true"
                                className="size-4"
                              />
                              <span className="flex-1">SMS Grievance</span>
                              <SmsAttentionBadge count={smsAttentionCount} />
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour-nav={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-3 text-[15px] font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
          data-tour="public-portal"
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
