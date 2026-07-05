"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FolderKanban, LayoutDashboard, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/admin-projects", icon: FolderKanban },
  { label: "Sync", href: "/sync", icon: RefreshCw },
  { label: "Checklists", href: "/checklists", icon: ClipboardCheck },
];

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-3 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-950">
      <div className="flex gap-1 overflow-x-auto">
        {items.map((item) => {
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
