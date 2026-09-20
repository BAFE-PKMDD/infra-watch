"use client";

import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileDown, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SlaTableRow } from "@/types/reports.types";

export function ReportDownloadButton({ data, moduleName }: { data: SlaTableRow[]; moduleName: string }) {
  function exportToCSV() {
    const headers = ["ID", "Reference", "Status", "Category", "Submitted", "First response", "Response time (ms)", "SLA breach"];
    const rows = data.map((item) => [
      item.id,
      item.referenceId,
      item.status,
      item.category || "N/A",
      format(item.createdAt, "yyyy-MM-dd HH:mm:ss"),
      item.firstResponseAt ? format(item.firstResponseAt, "yyyy-MM-dd HH:mm:ss") : "N/A",
      item.responseTimeMs?.toString() || "0",
      item.isSlaBreach ? "Yes" : "No",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${moduleName.toLowerCase()}-sla-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportToPDF() {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(`INFRA Watch - ${moduleName} SLA Report`, 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 22);
    doc.text(`Total records: ${data.length}`, 14, 27);

    const tableData = data.map((item) => [
      item.referenceId,
      item.status,
      format(item.createdAt, "MMM dd, HH:mm"),
      item.firstResponseAt ? format(item.firstResponseAt, "MMM dd, HH:mm") : "---",
      item.responseTimeMs ? `${(item.responseTimeMs / (1000 * 60 * 60)).toFixed(1)}h` : "---",
      item.isSlaBreach ? "BREACH" : "OK",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Reference", "Status", "Submitted", "Responded", "Time", "SLA"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
      styles: { fontSize: 8 },
    });

    doc.save(`${moduleName.toLowerCase()}-sla-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="min-h-11 gap-2 border-slate-200 dark:border-slate-800" />
        }
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Export report
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Choose format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="gap-2">
          <FileDown className="h-4 w-4 text-red-600" aria-hidden="true" />
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
