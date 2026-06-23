import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  FileText,
  Hammer,
  XCircle,
  PackageCheck,
  ClipboardCheck,
  Ban,
  RotateCcw,
  FileSearch,
  Handshake,
  Gavel,
  ShoppingCart
} from "lucide-react";

import type { StatusMeta } from "@/types";

export const statusConfig: Record<string, StatusMeta> = {
  // Completion Statuses
  "Completed": {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2
  },
  "On going": {
    label: "On going",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    icon: Hammer
  },
  "Not yet started": {
    label: "Not yet started",
    color: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800",
    icon: Clock
  },
  "Turned-over": {
    label: "Turned-over",
    color: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
    icon: Handshake
  },
  "For turn-over": {
    label: "For turn-over",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800",
    icon: PackageCheck
  },

  // Implementation Statuses
  "Under-construction": {
    label: "Under Construction",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    icon: Hammer
  },
  "Under Construction": {
    label: "Under Construction",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    icon: Hammer
  },
  "Implementation-ready": {
    label: "Implementation-ready",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800",
    icon: ClipboardCheck
  },
  "Implementation-ready with recommendations": {
    label: "Implementation-ready with recommendations",
    color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800",
    icon: FileText
  },

  // Procurement Statuses
  "Under-procurement": {
    label: "Under Procurement",
    color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
    icon: ShoppingCart
  },
  "For Procurement": {
    label: "For Procurement",
    color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-400 dark:border-fuchsia-800",
    icon: ShoppingCart
  },
  "Pre-Bid conference conducted": {
    label: "Pre-Bid Conference Conducted",
    color: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-400 dark:border-pink-800",
    icon: FileText
  },
  "Bid opening conducted": {
    label: "Bid Opening Conducted",
    color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800",
    icon: Gavel
  },
  "Issuance of Notice of Award approved": {
    label: "Notice of Award Approved",
    color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800",
    icon: FileText
  },

  // Planning & Validation Statuses
  "Proposal Validated": {
    label: "Proposal Validated",
    color: "bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950 dark:text-lime-400 dark:border-lime-800",
    icon: CheckCircle2
  },
  "For Validation": {
    label: "For Validation",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
    icon: FileSearch
  },
  "For Review": {
    label: "For Review",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    icon: FileSearch
  },
  "Inventory": {
    label: "Inventory",
    color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800",
    icon: ClipboardCheck
  },

  // Pending/Waiting Statuses
  "Not-yet Started": {
    label: "Not Yet Started",
    color: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800",
    icon: Clock
  },
  "For Later Release": {
    label: "For Later Release",
    color: "bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-950 dark:text-neutral-400 dark:border-neutral-800",
    icon: PauseCircle
  },

  // Issue/Problem Statuses
  "Incomplete Documents": {
    label: "Incomplete Documents",
    color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
    icon: AlertCircle
  },
  "Not feasible": {
    label: "Not Feasible",
    color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    icon: XCircle
  },
  "Terminated": {
    label: "Terminated",
    color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    icon: Ban
  },
  "Reverted": {
    label: "Reverted",
    color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
    icon: RotateCcw
  },

  // Legacy statuses (for backward compatibility)
  completed: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2
  },
  ongoing: {
    label: "Ongoing",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    icon: Clock
  },
  planned: {
    label: "Planned",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    icon: AlertCircle
  },
  suspended: {
    label: "Suspended",
    color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
    icon: PauseCircle
  }
};
