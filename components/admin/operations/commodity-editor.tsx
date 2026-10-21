"use client";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { OperationError, operationControl, operationRequest } from "./shared";
export function CommodityEditor({
  id,
  commodities,
}: {
  id: string;
  commodities: string[];
}) {
  const { user } = useAuth();
  const query = useQueryClient();
  const [value, setValue] = useState(commodities.join(", "));
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!hasPermission(user?.role, "projects", "update")) return null;
  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      await operationRequest(`/api/admin/projects/${id}/commodities`, "PATCH", {
        commodities: value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        reason,
      });
      await query.invalidateQueries({ queryKey: ["admin-projects"] });
      await query.invalidateQueries({ queryKey: ["public-projects"] });
      setNotice(
        "Commodity override saved and retained across future synchronizations.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save commodities",
      );
    } finally {
      setPending(false);
    }
  }
  async function reset() {
    if (
      !window.confirm(
        "Remove this local override and restore the latest synchronized source commodities?",
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      await operationRequest(`/api/admin/projects/${id}/commodities`, "DELETE");
      await query.invalidateQueries({ queryKey: ["admin-projects"] });
      await query.invalidateQueries({ queryKey: ["public-projects"] });
      setNotice("Source commodities restored.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not restore source values",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-primary">
        Edit commodities
      </summary>
      <form onSubmit={save} className="mt-2 min-w-64 space-y-3">
        <label className="block space-y-2 text-sm">
          <span>Commodities, separated by commas</span>
          <input
            className={operationControl}
            value={value}
            maxLength={2400}
            onChange={(event) => setValue(event.target.value)}
            disabled={pending}
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Reason for the local override</span>
          <textarea
            className={operationControl}
            value={reason}
            minLength={10}
            maxLength={1000}
            required
            onChange={(event) => setReason(event.target.value)}
            disabled={pending}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="min-h-11" disabled={pending}>
            Save commodities
          </Button>
          <Button
            className="min-h-11"
            type="button"
            variant="outline"
            onClick={reset}
            disabled={pending}
          >
            Restore source values
          </Button>
        </div>
        <OperationError error={error} />
        {notice && (
          <p role="status" className="text-sm">
            {notice}
          </p>
        )}
      </form>
    </details>
  );
}
