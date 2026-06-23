/**
 * Badge and Status Styling Utilities
 * Centralized badge class generation for consistent styling
 */

import { CheckCircle, XCircle, RefreshCw, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const BASE_BADGE_CLASSES = "px-2 py-1 rounded-full text-xs font-medium";

/**
 * Get badge CSS classes for project stage
 */
export function getStageBadgeClass(stage: string | null | undefined): string {
  if (!stage) {
    return `${BASE_BADGE_CLASSES} bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300`;
  }

  const normalizedStage = stage.toLowerCase();

  if (normalizedStage.includes("complete") || normalizedStage.includes("turned")) {
    return `${BASE_BADGE_CLASSES} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`;
  }
  if (normalizedStage.includes("ongoing") || normalizedStage.includes("on-going")) {
    return `${BASE_BADGE_CLASSES} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`;
  }
  if (normalizedStage.includes("planned") || normalizedStage.includes("implementation")) {
    return `${BASE_BADGE_CLASSES} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400`;
  }
  if (normalizedStage.includes("suspend") || normalizedStage.includes("cancel")) {
    return `${BASE_BADGE_CLASSES} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`;
  }
  if (normalizedStage.includes("inventory")) {
    return `${BASE_BADGE_CLASSES} bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400`;
  }
  if (normalizedStage.includes("procurement")) {
    return `${BASE_BADGE_CLASSES} bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400`;
  }
  if (normalizedStage.includes("proposal")) {
    return `${BASE_BADGE_CLASSES} bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400`;
  }

  return `${BASE_BADGE_CLASSES} bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300`;
}

/**
 * Get badge CSS classes for sync status
 */
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return `${BASE_BADGE_CLASSES} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`;
    case "failed":
      return `${BASE_BADGE_CLASSES} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`;
    case "running":
      return `${BASE_BADGE_CLASSES} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`;
    default:
      return `${BASE_BADGE_CLASSES} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400`;
  }
}

/**
 * Get icon component for sync status
 */
export function getStatusIcon(status?: string): LucideIcon {
  switch (status) {
    case "completed":
      return CheckCircle;
    case "failed":
      return XCircle;
    case "running":
      return RefreshCw;
    default:
      return Clock;
  }
}

/**
 * Get icon color classes for sync status
 */
export function getStatusIconClass(status?: string): string {
  switch (status) {
    case "completed":
      return "w-5 h-5 text-green-500";
    case "failed":
      return "w-5 h-5 text-red-500";
    case "running":
      return "w-5 h-5 text-blue-500 animate-spin";
    default:
      return "w-5 h-5 text-slate-400";
  }
}
