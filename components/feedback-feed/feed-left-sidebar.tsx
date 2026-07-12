"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Home,
  FolderKanban,
  AlertTriangle,
  Newspaper,
  Info,
  MessageSquare,
  Bell,
  LogIn,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/report-issue", label: "Report Issue", icon: AlertTriangle },
  { href: "/citizen-feed", label: "Citizen Feed", icon: MessageSquare },
  { href: "/about", label: "About", icon: Info },
] as const;

const USER_LINKS = [
  { href: "/my-feedbacks", label: "My Feedbacks", icon: MessageSquare },
  { href: "/my-issues", label: "My Issues", icon: AlertTriangle },
  { href: "/my-notifications", label: "Notifications", icon: Bell },
] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function FeedLeftSidebar() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <aside className="hidden lg:block w-[220px] xl:w-[240px] flex-shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 p-4">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#13233c]/60" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-[#13233c]/60 rounded" />
                  <div className="h-3 w-16 bg-slate-100 dark:bg-[#13233c]/40 rounded mt-1" />
                </div>
              </div>
            </div>
          ) : isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-700 dark:text-sky-400 font-semibold text-sm">
                    {getInitials(user.name || "U")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-sky-600 dark:text-sky-400">
                    Signed in
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-[#1e3a5f]/20 pt-3 space-y-0.5">
                {USER_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#13233c]/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#13233c]/60 mx-auto flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign in to share your feedback and report issues on INFRA projects
              </p>
              <Link
                href="/sign-in?callbackUrl=/citizen-feed"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Quick Nav */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 p-3">
          <p className="px-2.5 mb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Explore
          </p>
          <nav className="space-y-0.5">
            {NAV_LINKS.map((link) => {
              const isActive = link.href === "/citizen-feed";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${isActive
                    ? "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#13233c]/50 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
