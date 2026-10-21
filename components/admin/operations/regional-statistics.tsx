"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PHILIPPINE_REGIONS } from "@/lib/philippines-regions";
import { Button } from "@/components/ui/button";
import {
  OperationError,
  OperationTable,
  operationControl,
  operationDate,
  operationRequest,
} from "./shared";

type RegionalRecord = {
  id: string;
  year: number;
  region: string;
  program: string;
  fundedProjects: number | null;
  completedProjects: number | null;
  ongoingProjects: number | null;
  notYetStartedProjects: number | null;
  suspendedProjects: number | null;
  allocatedAmount: string | null;
  lengthCompleted: string | null;
  sourceName: string;
  sourceUrl: string;
  asOf: string;
  isPublished?: boolean;
  updatedAt?: string;
};
const metrics = [
  ["fundedProjects", "Funded projects"],
  ["completedProjects", "Completed projects"],
  ["ongoingProjects", "Ongoing projects"],
  ["notYetStartedProjects", "Projects not yet started"],
  ["suspendedProjects", "Suspended projects"],
  ["allocatedAmount", "Approved budget (PHP)"],
  ["lengthCompleted", "Completed linear infrastructure (km)"],
] as const;
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(),
  );
export function RegionalStatistics({
  editable = false,
}: {
  editable?: boolean;
}) {
  const client = useQueryClient();
  const [year, setYear] = useState(Number(today().slice(0, 4)));
  const [editing, setEditing] = useState<{ row?: RegionalRecord } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["regional-statistics", editable, year],
    queryFn: () =>
      operationRequest<{ data: RegionalRecord[] }>(
        `/api/${editable ? "admin" : "public"}/regional-statistics?year=${year}`,
      ),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      operationRequest("/api/admin/regional-statistics", "DELETE", { id }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["regional-statistics"] }),
  });
  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      operationRequest("/api/admin/regional-statistics", "PUT", values),
    onSuccess: async () => {
      setEditing(null);
      setNotice("Regional figures saved.");
      await client.invalidateQueries({ queryKey: ["regional-statistics"] });
    },
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = {
      year: Number(form.get("year")),
      region: form.get("region"),
      program: form.get("program"),
      sourceName: form.get("sourceName"),
      sourceUrl: form.get("sourceUrl"),
      asOf: form.get("asOf"),
      isPublished: form.has("isPublished"),
    };
    for (const [field] of metrics)
      data[field] =
        String(form.get(field) || "").trim() === ""
          ? null
          : Number(form.get(field));
    try {
      await save.mutateAsync(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Figures could not be saved",
      );
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-2 text-sm font-medium">
          <span>Funding year</span>
          <select
            className={operationControl}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {Array.from({ length: 101 }, (_, index) => 2000 + index).map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        {editable && (
          <Button
            className="min-h-11"
            onClick={() => {
              setEditing({});
              setError("");
              setNotice("");
            }}
          >
            Add sourced regional figures
          </Button>
        )}
      </div>
      <p className="text-sm leading-7 text-muted-foreground">
        These are separately reported regional figures with their own source and
        assessment date. Blank measures are unavailable. Live ABEMIS portfolio
        totals are available in Infrastructure Analytics.
      </p>
      <OperationError error={query.error || remove.error || error} />
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {editing && (
        <form
          onSubmit={submit}
          className="space-y-5 border-y border-border py-6"
        >
          <h2 className="text-lg font-semibold">
            {editing.row ? "Edit regional figures" : "Add regional figures"}
          </h2>
          <fieldset
            disabled={save.isPending}
            className="grid gap-4 sm:grid-cols-2"
          >
            <label className="space-y-2 text-sm">
              <span>Funding year</span>
              <input
                className={operationControl}
                type="number"
                name="year"
                min={2000}
                max={2100}
                required
                defaultValue={editing.row?.year ?? year}
                readOnly={Boolean(editing.row)}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span>Region</span>
              {editing.row && (
                <input type="hidden" name="region" value={editing.row.region} />
              )}
              <select
                className={operationControl}
                name="region"
                disabled={Boolean(editing.row)}
                required
                defaultValue={
                  editing.row?.region ?? PHILIPPINE_REGIONS[0].displayName
                }
              >
                {PHILIPPINE_REGIONS.map((region) => (
                  <option key={region.code}>{region.displayName}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span>Program</span>
              {editing.row && (
                <input
                  type="hidden"
                  name="program"
                  value={editing.row.program}
                />
              )}
              <select
                className={operationControl}
                name="program"
                disabled={Boolean(editing.row)}
                defaultValue={editing.row?.program ?? "AMEFIP"}
              >
                <option>AMEFIP</option>
                <option>INS</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span>Assessment date</span>
              <input
                className={operationControl}
                type="date"
                name="asOf"
                required
                defaultValue={editing.row?.asOf ?? today()}
              />
            </label>
            {metrics.map(([field, label]) => (
              <label key={field} className="space-y-2 text-sm">
                <span>{label}</span>
                <input
                  className={operationControl}
                  name={field}
                  type="number"
                  min={0}
                  step={
                    field === "allocatedAmount"
                      ? "0.01"
                      : field === "lengthCompleted"
                        ? "0.001"
                        : "1"
                  }
                  defaultValue={editing.row?.[field] ?? ""}
                />
              </label>
            ))}
            <label className="space-y-2 text-sm">
              <span>Source or issuing office</span>
              <input
                className={operationControl}
                name="sourceName"
                maxLength={200}
                required
                defaultValue={editing.row?.sourceName}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span>Source document URL</span>
              <input
                className={operationControl}
                name="sourceUrl"
                type="url"
                required
                maxLength={2048}
                defaultValue={editing.row?.sourceUrl}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                className="size-5 accent-primary"
                type="checkbox"
                name="isPublished"
                defaultChecked={editing.row?.isPublished ?? false}
              />
              Publish these sourced figures
            </label>
          </fieldset>
          <div className="flex gap-3">
            <Button
              type="submit"
              className="min-h-11"
              disabled={save.isPending}
            >
              Save figures
            </Button>
            <Button
              className="min-h-11"
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={save.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {query.isPending && <p role="status">Loading regional figures…</p>}
      {query.data?.data.length ? (
        <OperationTable label="Sourced regional statistics">
          <thead>
            <tr>
              <th className="min-w-48">Region / program</th>
              <th>Funded</th>
              <th>Completed</th>
              <th>Ongoing</th>
              <th>Not yet started</th>
              <th>Suspended</th>
              <th>Approved budget</th>
              <th>Completed km</th>
              <th className="min-w-48">Source / assessment date</th>
              {editable && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {query.data.data.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.region}
                  <br />
                  {row.program}
                  {editable && <p>{row.isPublished ? "Published" : "Draft"}</p>}
                </td>
                <td>{row.fundedProjects ?? "Unavailable"}</td>
                <td>{row.completedProjects ?? "Unavailable"}</td>
                <td>{row.ongoingProjects ?? "Unavailable"}</td>
                <td>{row.notYetStartedProjects ?? "Unavailable"}</td>
                <td>{row.suspendedProjects ?? "Unavailable"}</td>
                <td>
                  {row.allocatedAmount === null
                    ? "Unavailable"
                    : new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      }).format(Number(row.allocatedAmount))}
                </td>
                <td>{row.lengthCompleted ?? "Unavailable"}</td>
                <td>
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-primary underline"
                  >
                    {row.sourceName}
                  </a>
                  <p>{row.asOf}</p>
                  {editable && row.updatedAt && (
                    <p className="mt-1 text-muted-foreground">
                      Updated {operationDate(row.updatedAt)}
                    </p>
                  )}
                </td>
                {editable && (
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          setEditing({ row });
                          setError("");
                        }}
                      >
                        Edit figures
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete the ${row.year} figures for ${row.region}, ${row.program}?`,
                            )
                          )
                            remove.mutate(row.id);
                        }}
                      >
                        Delete figures
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </OperationTable>
      ) : (
        query.data && (
          <p className="border border-dashed border-border p-6 text-sm">
            No {editable ? "sourced" : "published"} regional figures are
            available for {year}.
          </p>
        )
      )}
    </div>
  );
}
