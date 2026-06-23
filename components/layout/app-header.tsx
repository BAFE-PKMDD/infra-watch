"use client";

import Link from "next/link";
import { Menu, Moon, Sun, X, LogOut, LayoutDashboard, MessageSquareDot, Bell, AlertCircle, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LanguageToggle } from "@/components/language/language-toggle";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";

const navItems = [
  { label: "Home", href: "/", key: "home" },
  { label: "Projects", href: "/projects", key: "projects" },
  { label: "Map", href: "/map", key: "map" },
  { label: "About", href: "/about", key: "about" },
  { label: "E-Report", href: "/report-issue", key: "report-issue" },
  { label: "Articles & Updates", href: "/articles-and-updates", key: "articles-and-updates", isSecondary: true },
  { label: "FAQ", href: "/faq", key: "faq", isSecondary: true },
  { label: "Contact Us", href: "/contact", key: "contact", isSecondary: true },
] as { label: string; href: string; key: string; requiresAuth?: boolean; isSecondary?: boolean }[];

type NavKey = (typeof navItems)[number]["key"];
type ThemeMode = "light" | "dark";

interface AppHeaderProps {
  activeItem?: NavKey;
  actionLabel?: string;
}

export function AppHeader({ activeItem = "home", actionLabel }: AppHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const [isLiveNow] = useState(false);

  const translatedNavItems = navItems.map(item => ({
    ...item,
    label: t(`nav.${item.key === 'report-issue' ? 'report' :
      item.key.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`)
  }));

  const displayActionLabel = actionLabel || t("nav.signIn");

  const syncTheme = (next: ThemeMode) => {
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", next);
  };

  const resolveTheme = (): ThemeMode => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  useEffect(() => {
    const initial = resolveTheme();
    syncTheme(initial);
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (event: MediaQueryListEvent) => {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") return;
      syncTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", handleMediaChange);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "theme" || !event.newValue) return;
      if (event.newValue === "dark" || event.newValue === "light") {
        syncTheme(event.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      media.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    syncTheme(isDark ? "light" : "dark");
  };

  const getUserInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('[aria-label="User menu"]') && !target.closest('.absolute')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40 dark:bg-slate-900 dark:border-slate-800 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary flex items-center justify-center text-white font-bold rounded">
                IW
              </div>
              <div className="hidden sm:block">
                <h1 className="flex items-center text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  INFRA WATCH
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                    AMEFIP
                  </span>
                </h1>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold dark:text-slate-400">
                  Fair Reporting & Accountability Portal
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            {user && <NotificationBell />}
            <LanguageToggle />
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
              aria-label="Toggle theme"
              title="Toggle light/dark mode"
            >
              <Sun className="w-5 h-5 block dark:hidden" />
              <Moon className="w-5 h-5 hidden dark:block" />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-4 lg:gap-8">
              {translatedNavItems
                .filter(item => (!item.requiresAuth || user) && !item.isSecondary)
                .map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "text-[13px] lg:text-sm font-bold transition-colors whitespace-nowrap relative",
                      activeItem === item.key
                        ? "text-primary"
                        : "text-slate-700 hover:text-primary dark:text-slate-200 dark:hover:text-primary"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}

              {mounted ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        className={cn(
                          "flex items-center gap-1 text-[13px] lg:text-sm font-bold transition-colors whitespace-nowrap outline-none",
                          translatedNavItems.some(i => i.isSecondary && i.key === activeItem)
                            ? "text-primary"
                            : "text-slate-700 hover:text-primary dark:text-slate-200 dark:hover:text-primary"
                        )}
                      >
                        {t("nav.more")}
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 [--accent-foreground:var(--foreground)]">
                    {translatedNavItems
                      .filter(item => item.isSecondary)
                      .map((item) => (
                        <DropdownMenuItem key={item.key} className="focus:bg-slate-100 dark:focus:bg-slate-800">
                          <Link
                            href={item.href}
                            className={cn(
                              "w-full cursor-pointer font-bold block py-1",
                              activeItem === item.key ? "text-primary" : "text-slate-700 dark:text-slate-200"
                            )}
                          >
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  className={cn(
                    "flex items-center gap-1 text-[13px] lg:text-sm font-bold transition-colors whitespace-nowrap outline-none text-slate-700 dark:text-slate-200"
                  )}
                >
                  {t("nav.more")}
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-6">
              {!mounted || isLoading ? (
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="User menu"
                  >
                    <div className="w-9 h-9 flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold border-2 border-primary">
                        {getUserInitials(user.name)}
                      </div>
                    </div>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      {user.role !== "citizen" && (
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          {t("nav.dashboard")}
                        </Link>
                      )}
                      <Link
                        href="/my-feedbacks"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <MessageSquareDot className="w-4 h-4" />
                        {t("nav.myFeedback")}
                      </Link>
                      <Link
                        href="/my-issues"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <AlertCircle className="w-4 h-4" />
                        {t("nav.myReports")}
                      </Link>
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("nav.signOut")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/95 transition-colors shadow-sm"
                >
                  {displayActionLabel}
                </Link>
              )}
              {user && <NotificationBell />}
              <LanguageToggle />
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
                aria-label="Toggle theme"
              >
                <Sun className="w-5 h-5 block dark:hidden" />
                <Moon className="w-5 h-5 hidden dark:block" />
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 pt-4 pb-6 space-y-4">
            <div className="flex flex-col space-y-3">
              {translatedNavItems
                .filter(item => !item.requiresAuth || user)
                .map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "text-base font-medium px-3 py-2 rounded-lg transition-colors",
                      activeItem === item.key
                        ? "bg-primary/10 text-primary"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                      "flex items-center justify-between"
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}
            </div>
            {user ? (
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold border-2 border-primary">
                    {getUserInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.role !== "citizen" && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t("nav.dashboard")}
                  </Link>
                )}
                <Link
                  href="/my-feedbacks"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <MessageSquareDot className="w-4 h-4" />
                  {t("nav.myFeedback")}
                </Link>
                <Link
                  href="/my-issues"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <AlertCircle className="w-4 h-4" />
                  {t("nav.myReports")}
                </Link>
                <button
                  onClick={async () => {
                    setMobileOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t("nav.signOut")}
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="block text-center w-full px-4 py-3 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/95 transition-colors shadow-sm"
                onClick={() => setMobileOpen(false)}
              >
                {displayActionLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
