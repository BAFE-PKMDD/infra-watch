"use client";

import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SlaSummary } from "@/types/reports.types";

function formatDuration(ms: number) {
  if (ms === 0) return "0h";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) {
    const minutes = Math.round(ms / (1000 * 60));
    return `${minutes}m`;
  }
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

export function SlaSummaryCards({ summary, title }: { summary: SlaSummary; title: string }) {
  const stats = [
    {
      label: "Avg response time",
      value: formatDuration(summary.avgResponseTime),
      icon: Clock,
      description: "Average time to first human response",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Median response",
      value: formatDuration(summary.medianResponseTime),
      icon: TrendingUp,
      description: "Middle response time (reduces outlier impact)",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Volume",
      value: summary.totalItems.toLocaleString("en-PH"),
      icon: CheckCircle2,
      description: `${summary.respondedItems.toLocaleString("en-PH")} items responded to`,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Max response",
      value: formatDuration(summary.maxResponseTime),
      icon: AlertTriangle,
      description: "Slowest response recorded",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <div>
      <h2 className="sr-only">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {stat.label}
              </CardTitle>
              <div className={`rounded-lg p-1.5 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-950 dark:text-white">{stat.value}</div>
              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
