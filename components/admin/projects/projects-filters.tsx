"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectsFiltersProps = {
  search: string;
  status: string;
  program: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onProgramChange: (value: string) => void;
  onReset: () => void;
};

export function ProjectsFilters({
  search,
  status,
  program,
  onSearchChange,
  onStatusChange,
  onProgramChange,
  onReset,
}: ProjectsFiltersProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_160px_160px_auto] dark:border-slate-800 dark:bg-slate-900">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by title or ABEMIS code"
          className="pl-9"
        />
      </div>
      <select
        value={program}
        onChange={(event) => onProgramChange(event.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-transparent px-2 text-sm font-semibold dark:border-slate-800"
      >
        <option value="all">All programs</option>
        <option value="AMEFIP">AMEFIP</option>
        <option value="INS">INS</option>
      </select>
      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-transparent px-2 text-sm font-semibold dark:border-slate-800"
      >
        <option value="all">All statuses</option>
        <option value="planned">Planned</option>
        <option value="ongoing">Ongoing</option>
        <option value="completed">Completed</option>
        <option value="suspended">Suspended</option>
      </select>
      <Button type="button" variant="outline" onClick={onReset}>
        <X className="size-4" />
        Reset
      </Button>
    </div>
  );
}
