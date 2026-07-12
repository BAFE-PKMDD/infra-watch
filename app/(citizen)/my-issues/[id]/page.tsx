"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFullUrl } from "@/lib/minio-url";
import { useAuth } from "@/providers/auth-provider";

type IssueStatus = "pending" | "reviewing" | "resolved" | "closed";

interface IssueResponse {
  id: string;
  message: string;
  statusChange: string | null;
  newStatus: string | null;
  attachmentUrls: string[];
  createdAt: string;
  updatedAt: string;
  responder: {
    name: string;
    role: string;
  };
}

interface IssueDetail {
  id: string;
  ticketNumber?: string;
  projectId?: string | null;
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  issueType: string;
  issueDescription: string;
  dateNoticed: string;
  status: string;
  photoUrls: string[];
  videoUrls: string[];
  documentUrls: string[];
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  project?: {
    id: string | null;
    name: string;
    code: string | null;
  } | null;
  responses: IssueResponse[];
}

const STATUS_CONFIG: Record<
  IssueStatus,
  {
    label: string;
    color: string;
    icon: LucideIcon;
  }
> = {
  pending: {
    label: "Pending Review",
    color: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
    icon: Clock,
  },
  reviewing: {
    label: "Under Review",
    color: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    icon: AlertCircle,
  },
  resolved: {
    label: "Resolved",
    color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    color: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
    icon: XCircle,
  },
};

function normalizeIssueStatus(status: string): IssueStatus {
  if (status === "reviewing" || status === "resolved" || status === "closed" || status === "pending") {
    return status;
  }
  if (status === "submitted") return "pending";
  if (status === "in-progress") return "reviewing";
  if (status === "suspended") return "closed";
  return "pending";
}

function IssueStateMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AppHeader activeItem="home" />
      <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-slate-400" />
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mb-6 text-slate-600 dark:text-slate-300">{message}</p>
          <Link href="/my-issues">
            <Button>Back to My Issues</Button>
          </Link>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AppHeader activeItem="home" />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mb-6 h-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-56 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <AppFooter />
    </div>
  );
}

export default function MyIssueDetailPage() {
  const { user, isLoading: sessionLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const issueId = params.id as string;

  const { data: issue, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: async () => {
      const response = await fetch(`/api/issues/${issueId}`);
      if (!response.ok) {
        if (response.status === 401) throw new Error("Please sign in to view this issue.");
        throw new Error("Failed to fetch issue.");
      }
      const result = (await response.json()) as { data: IssueDetail };
      return result.data;
    },
    enabled: !sessionLoading && !!user,
  });

  if (!sessionLoading && !user) {
    router.push("/sign-in?redirect=/my-issues");
    return null;
  }

  if (sessionLoading || isLoading) {
    return <LoadingSkeleton />;
  }

  if (!issue) {
    return (
      <IssueStateMessage
        title="Issue Not Found"
        message="The issue does not exist or you do not have permission to view it."
      />
    );
  }

  const issueStatus = normalizeIssueStatus(issue.status);
  const status = STATUS_CONFIG[issueStatus];
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AppHeader activeItem="home" />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/my-issues">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Issues
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${status.color}`}>
                  <StatusIcon className="h-4 w-4" />
                  {status.label}
                </span>
                <Badge variant="outline">{issue.issueType}</Badge>
                {issue.ticketNumber && <Badge variant="outline">{issue.ticketNumber}</Badge>}
              </div>
              <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
                {issue.issueDescription}
              </h1>
              <div className="grid grid-cols-1 gap-4 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {[issue.streetLandmark, issue.barangay, issue.city, issue.province]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Reported {format(new Date(issue.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Noticed on {format(new Date(issue.dateNoticed || issue.createdAt), "MMM d, yyyy")}</span>
                </div>
                {issue.project && (
                  <div>
                    <strong>Related Project:</strong> {issue.project.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {issue.photoUrls.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Evidence Photos</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {issue.photoUrls.map((url, index) => {
                  const fullUrl = getFullUrl(url);
                  if (!fullUrl) return null;

                  return (
                    <div
                      key={`${url}-${index}`}
                      className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <Image
                        src={fullUrl}
                        alt={`Evidence ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <MessageSquare className="h-5 w-5" />
            Official Responses ({issue.responses.length})
          </h2>

          {issue.responses.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">
              <Clock className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p>No official responses yet. You will be notified when there is an update.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {issue.responses.map((response) => (
                <div
                  key={response.id}
                  className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        <User className="h-4 w-4" />
                        {response.responder.name}
                        <Badge variant="outline" className="text-xs">
                          {response.responder.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {format(new Date(response.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    {response.statusChange && (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Status: {response.statusChange}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {response.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <AppFooter />
    </div>
  );
}
