"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  SlidersHorizontal, 
  CheckCircle2, 
  Clock, 
  FolderKanban,
  ChevronRight,
  Plus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { getMockIssues, IssueReport } from "@/lib/issues-mock-store";

export default function ReportIssueFeed() {
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [mounted, setMounted] = useState(false);

  // Feed filter states
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [feedActiveStatus, setFeedActiveStatus] = useState<"all" | "pending" | "in-progress" | "resolved">("all");

  useEffect(() => {
    setIssues(getMockIssues());
    setMounted(true);
  }, []);

  // Filtered issues calculation
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch = 
        issue.projectName.toLowerCase().includes(feedSearchQuery.toLowerCase()) ||
        issue.id.toLowerCase().includes(feedSearchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(feedSearchQuery.toLowerCase());
      
      const matchesStatus = feedActiveStatus === "all" || issue.status === feedActiveStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [issues, feedSearchQuery, feedActiveStatus]);

  // Statistics calculation for issues
  const stats = useMemo(() => {
    const total = issues.length;
    const pending = issues.filter(i => i.status === "pending").length;
    const active = issues.filter(i => i.status === "in-progress").length;
    const resolved = issues.filter(i => i.status === "resolved").length;
    return { total, pending, active, resolved };
  }, [issues]);

  const statusFilterTabs = [
    { id: "all", label: "All Reports" },
    { id: "pending", label: "Pending Review" },
    { id: "in-progress", label: "In Progress" },
    { id: "resolved", label: "Resolved" }
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 lg:py-16 min-h-screen font-sans">
      <div className="space-y-10">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Issues Tracking Feed
            </h1>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-2 font-medium">
              Public ledger of active equipment repairs, leaks, and delays monitored by BAFE coordinators.
            </p>
          </div>
          <Link href="/report-issue/new">
            <Button
              className="bg-primary hover:bg-primary/95 text-white text-xs font-bold h-10 px-5 rounded-xl shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Report an Issue
            </Button>
          </Link>
        </div>

        {/* Overview Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-450">Total Issues</p>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{mounted ? stats.total : 0}</h4>
              </div>
              <div className="p-2.5 bg-primary/5 rounded-lg text-primary dark:bg-primary/10">
                <FolderKanban className="w-4.5 h-4.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-450">Pending Review</p>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{mounted ? stats.pending : 0}</h4>
              </div>
              <div className="p-2.5 bg-slate-100 rounded-lg text-slate-500 dark:bg-slate-800">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-450">Active Repair</p>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{mounted ? stats.active : 0}</h4>
              </div>
              <div className="p-2.5 bg-accent/5 rounded-lg text-accent dark:bg-accent/10">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-455">Resolved</p>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{mounted ? stats.resolved : 0}</h4>
              </div>
              <div className="p-2.5 bg-emerald-500/5 rounded-lg text-emerald-500 dark:bg-emerald-500/10">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Deck */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Text Filter Tabs */}
            <div className="flex border-b border-slate-200/80 dark:border-slate-800/80 gap-6 w-full sm:w-auto overflow-x-auto scrollbar-none">
              {statusFilterTabs.map((tab) => {
                const isActive = feedActiveStatus === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFeedActiveStatus(tab.id)}
                    className={`pb-2.5 text-xs font-bold transition-all relative outline-none cursor-pointer whitespace-nowrap ${
                      isActive 
                        ? "text-primary font-extrabold" 
                        : "text-slate-450 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeFeedTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Minimal Search Input */}
            <div className="relative w-full sm:max-w-xs shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                type="text" 
                placeholder="Search issues..." 
                value={feedSearchQuery}
                onChange={(e) => setFeedSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 rounded-lg pl-9 pr-7 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              />
              {feedSearchQuery && (
                <button 
                  onClick={() => setFeedSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-650"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Reported Issues Cards List */}
          <div className="space-y-4 pt-2">
            {mounted ? (
              <AnimatePresence mode="popLayout">
                {filteredIssues.map((issue) => (
                  <motion.div
                    key={issue.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link href={`/report-issue/${issue.id}`} className="block">
                      <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-350/80 dark:hover:border-slate-700/80 transition-all rounded-2xl p-6 relative overflow-hidden group hover:shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          
                          {/* Left: Info */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-400 font-mono uppercase">
                              <span>{issue.id}</span>
                              <span>•</span>
                              <span className="text-primary">{issue.category}</span>
                              <span>•</span>
                              <span>{issue.date}</span>
                            </div>
                            
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                              {issue.description}
                            </h3>
                            
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <span className="font-semibold text-slate-600 dark:text-slate-300">{issue.projectName}</span>
                              <span className="font-mono text-[10px] text-slate-400">({issue.projectId})</span>
                            </p>
                          </div>

                          {/* Right: Status Dot & Reporter */}
                          <div className="flex items-center sm:flex-col items-end gap-3 sm:gap-1.5 shrink-0 self-stretch sm:self-center justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 dark:border-slate-850/80 pt-2 sm:pt-0">
                            {/* Status Pill Indicator */}
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                issue.status === "resolved" ? "bg-emerald-500" :
                                issue.status === "in-progress" ? "bg-amber-500" : "bg-slate-400"
                              }`} />
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                                {issue.status === "in-progress" ? "In Progress" : issue.status}
                              </span>
                            </div>
                            
                            {/* Reporter label */}
                            <span className="text-[10px] text-slate-405 font-bold">
                              By: {issue.reporter}
                            </span>
                          </div>

                          {/* Chevron Action Indicator */}
                          <ChevronRight className="hidden sm:block w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              // Skeletal/Placeholder Loading
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-6 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-1/4 mb-3" />
                    <div className="h-5 bg-slate-200 dark:bg-slate-850 rounded w-3/4" />
                  </Card>
                ))}
              </div>
            )}

            {mounted && filteredIssues.length === 0 && (
              <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-12 text-center flex flex-col items-center justify-center rounded-2xl">
                <SlidersHorizontal className="w-6 h-6 text-slate-400 mb-3" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-white">No reported issues found</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Try altering your search text or selecting a different status filter.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
