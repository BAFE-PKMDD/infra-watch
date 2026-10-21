"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ExportProject } from "@/lib/project-export";

export function ProjectExportButton({ params }: { params: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function download(format: "csv" | "pdf") {
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/public/project-export?${params}&format=${format}`,
      );
      if (!response.ok)
        throw new Error((await response.json()).error || "Export unavailable");
      if (format === "csv") {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "infrawatch-projects.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { data, exportedAt } = (await response.json()) as {
          data: ExportProject[];
          exportedAt: string;
        };
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ]);
        const pdf = new jsPDF({ orientation: "landscape" });
        pdf.setFontSize(16);
        pdf.text("INFRA Watch project catalog", 14, 15);
        pdf.setFontSize(9);
        pdf.text(
          `Source: synchronized ABEMIS records. Exported ${new Date(exportedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (Asia/Manila)`,
          14,
          22,
        );
        autoTable(pdf, {
          startY: 28,
          head: [
            [
              "Code",
              "Project",
              "Program",
              "Status",
              "Province",
              "Year",
              "Approved budget (PHP)",
            ],
          ],
          body: data.map((row) => [
            row.code,
            row.name,
            row.program,
            row.status,
            row.province ?? "Unavailable",
            row.year ?? "Unavailable",
            row.approvedBudget ?? "Unavailable",
          ]),
          styles: { fontSize: 8, overflow: "linebreak" },
        });
        pdf.save("infrawatch-projects.pdf");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="min-h-11"
        disabled={pending}
        onClick={() => download("csv")}
      >
        Export CSV
      </Button>
      <Button
        variant="outline"
        className="min-h-11"
        disabled={pending}
        onClick={() => download("pdf")}
      >
        Export PDF
      </Button>
      {pending && (
        <span role="status" className="text-sm">
          Preparing export…
        </span>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
