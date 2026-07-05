import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminProject = {
  id: string;
  sourceProjectId: string;
  projectCode: string | null;
  name: string;
  program: string;
  projectType: string;
  status: string;
  province: string | null;
  municipality: string | null;
  budget: string | null;
  physicalProgress: number;
  lastSyncedAt: string | Date;
};

function formatCurrency(value: string | null) {
  const number = Number(value ?? 0);
  if (!number) return "N/A";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectsTable({ projects, isLoading }: { projects: AdminProject[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        Loading synced projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        No projects synced yet. Run ABEMIS Sync first.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Progress</TableHead>
            <TableHead>Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell className="max-w-sm whitespace-normal">
                <Link href={`/projects/${project.sourceProjectId}`} className="font-extrabold text-slate-950 hover:text-primary dark:text-white">
                  {project.name}
                </Link>
                <p className="mt-1 font-mono text-xs text-slate-500">{project.projectCode ?? project.sourceProjectId}</p>
              </TableCell>
              <TableCell>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{project.program}</span>
              </TableCell>
              <TableCell className="capitalize">{project.status}</TableCell>
              <TableCell>{[project.municipality, project.province].filter(Boolean).join(", ") || "N/A"}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(project.budget)}</TableCell>
              <TableCell className="text-right font-mono">{project.physicalProgress}%</TableCell>
              <TableCell>{formatDate(project.lastSyncedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
