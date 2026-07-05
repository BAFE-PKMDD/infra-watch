"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  FolderKanban,
  Home,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
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
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, resource: "dashboard", action: "view" },
      { label: "Projects", href: "/admin-projects", icon: FolderKanban, resource: "projects", action: "list" },
      { label: "Checklists", href: "/checklists", icon: ClipboardCheck, resource: "projects", action: "list" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "ABEMIS Sync", href: "/sync", icon: RefreshCw, resource: "abemis_sync", action: "view" },
      { label: "Analytics", href: "/dashboard#analytics", icon: BarChart3, resource: "analytics", action: "view" },
    ],
  },
] as const;

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-68 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/infra-watch-logo.png"
            alt="INFRA Watch logo"
            width={80}
            height={53}
            className="h-10 w-auto flex-shrink-0 rounded bg-white object-contain"
            unoptimized
          />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-950 dark:text-white">INFRA WATCH</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Admin Console</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {menu.map((category) => {
          const visibleItems = category.items.filter((item) => hasPermission(role, item.resource as never, item.action as never));
          if (visibleItems.length === 0) return null;

          return (
            <div key={category.label} className="space-y-2">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{category.label}</p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors",
                        active
                          ? "bg-primary text-white"
                          : "text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900",
                      )}
                    >
                      <Icon className="size-4" />
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
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <Home className="size-4" />
          Public Portal
        </Link>
        <div className="mt-2 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <ShieldCheck className="size-4 text-primary" />
          {role ?? "staff"} access
        </div>
      </div>
    </aside>
  );
}
