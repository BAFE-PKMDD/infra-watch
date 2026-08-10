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
    <Card className="overflow-hidden bg-[#121927] border-slate-800">
      <Table>
        <TableHeader className="bg-[#0f172a] border-b border-slate-800">
          <TableRow>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider hover:text-white transition-colors">
                Project Name/Code
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider hover:text-white transition-colors">
                Location
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider hover:text-white transition-colors text-center leading-tight">
                Implementing<br/>Agency
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider hover:text-white transition-colors text-center leading-tight">
                Budget<br/>(PHP)
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-left">
              <button className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider hover:text-white transition-colors">
                Status
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </TableHead>
            <TableHead className="px-6 py-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-800">
          {projects.map((project) => (
            <TableRow
              key={project.id}
              className="hover:bg-slate-800/50 transition-colors group cursor-pointer border-slate-800"
            >
              <TableCell className="px-6 py-5 whitespace-normal">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <p className="text-[14px] font-bold text-white group-hover:text-slate-300 transition-colors line-clamp-2">
                    {project.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1.5 font-mono uppercase tracking-wide">{project.code}</p>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5 whitespace-normal">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-[16px] h-[16px] text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[14px] text-slate-300">{project.location}</p>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5 whitespace-normal">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <p className="text-[14px] font-medium text-slate-300">{project.implementingAgency}</p>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <p className="text-[14px] font-bold text-white">{formatCurrency(project.budget)}</p>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`} className="block">
                  <p className="text-[14px] text-slate-300">{project.stage || "Not yet started"}</p>
                </Link>
              </TableCell>
              <TableCell className="px-6 py-5 text-center">
                <Link href={`/projects/${project.id}${queryString ? `?${queryString}` : queryString.includes('tab=') ? `?${queryString}` : `?${queryString}&tab=feedback`}`}>
                  <Button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    className="px-5 py-2 h-auto text-[13px] font-semibold bg-[#4caf50] hover:bg-[#43a047] text-[#111827] border-0"
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
