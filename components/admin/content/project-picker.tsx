"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { contentButtonClass, contentControlClass } from "./content-controls";
import { cn } from "@/lib/utils";

export function ProjectPicker({
  initialCode,
  required,
}: {
  initialCode: string;
  required: boolean;
}) {
  const { user } = useAuth();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, isFetching, isError } = useQuery({
    queryKey: [
      "article-project-search",
      user?.id,
      user?.role,
      user?.region,
      user?.assignedAgency,
      query,
    ],
    enabled: Boolean(user?.id) && query.trim().length >= 2,
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/projects?search=${encodeURIComponent(query)}&pageSize=10`,
      );
      if (!response.ok) throw new Error("Project search unavailable");
      return response.json() as Promise<{
        projects: { abemisId: string; name: string }[];
      }>;
    },
  });
  return (
    <div className="space-y-2">
      <input type="hidden" name="projectId" value={code} />
      {code ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 px-3 py-2">
          <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm">
            {name ? <span className="block font-medium">{name}</span> : null}
            <span
              className={cn(
                "block break-all",
                name && "text-muted-foreground",
              )}
            >
              {code}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(contentButtonClass, "size-11")}
            aria-label="Clear related project"
            onClick={() => {
              setCode("");
              setName("");
              setSearch("");
            }}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <>
          <label htmlFor="article-project-search" className="sr-only">
            Search related project
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="article-project-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              required={required && !code}
              placeholder="Search by name or project code…"
              className={cn(contentControlClass, "rounded-lg pl-9")}
              autoComplete="off"
            />
          </div>
          {isFetching ? (
            <p role="status" className="text-sm">
              Searching projects…
            </p>
          ) : isError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              Project search is unavailable. Try again.
            </p>
          ) : query.length >= 2 && data?.projects.length === 0 ? (
            <p className="text-sm">No projects match this search.</p>
          ) : null}
          {search && data?.projects.length ? (
            <ul className="max-h-56 overflow-y-auto rounded-lg border border-slate-300 bg-popover shadow-sm dark:border-slate-600">
              {data.projects.map((project) => (
                <li
                  key={project.abemisId}
                  className="border-b border-slate-200 last:border-0 dark:border-slate-700"
                >
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => {
                      setCode(project.abemisId);
                      setName(project.name);
                      setSearch("");
                    }}
                  >
                    <MapPin
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {project.name}
                      </span>
                      <span className="block break-all text-muted-foreground">
                        {project.abemisId}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
