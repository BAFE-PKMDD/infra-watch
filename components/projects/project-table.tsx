import Link from "next/link";
import { ChevronDown, MapPin } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { ProjectDisplayItem } from "@/types";

interface ProjectTableProps {
  projects: ProjectDisplayItem[];
}

export function ProjectTable({ projects }: ProjectTableProps) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return (
    <Card className="overflow-hidden bg-slate-50/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
      <Table>
        <TableHeader className="bg-slate-50/80 border-b border-slate-200 dark:bg-slate-900/40 dark:border-slate-800">
          <TableRow>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">
                Project Name/Code
                <ChevronDown className="w-4 h-4" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">
                Location
                <ChevronDown className="w-4 h-4" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">
                Implementing Agency
                <ChevronDown className="w-4 h-4" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">
                Budget (PHP)
                <ChevronDown className="w-4 h-4" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">
                Status
                <ChevronDown className="w-4 h-4" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100">
          {projects.map((project) => (
            <TableRow
              key={project.id}
              className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group cursor-pointer"
            >
              <TableCell className="px-6 py-5 whitespace-normal">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors line-clamp-2 dark:text-white">
                    {project.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-mono dark:text-slate-300">{project.code}</p>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5 whitespace-normal">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700 dark:text-slate-200">{project.location}</p>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{project.implementingAgency}</p>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(project.budget)}</p>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <p className="text-sm text-slate-700 dark:text-slate-200">{project.stage || "N/A"}</p>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : queryString.includes('tab=') ? `?${queryString}` : `?${queryString}&tab=feedback`}`}>
                  <Button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    className="px-4 py-2 text-sm font-semibold hover:bg-primary hover:text-primary-foreground"
                  >
                    Feedback
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
