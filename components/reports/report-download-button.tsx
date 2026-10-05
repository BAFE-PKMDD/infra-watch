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
import { buildSlaCsv, buildSlaPdfRows } from "@/lib/reports/export";
import { formatReportTimestamp } from "@/lib/reports/format";

export function ReportDownloadButton({ data, moduleName }: { data: SlaTableRow[]; moduleName: string }) {
  function exportToCSV() {
    const csvContent = buildSlaCsv(data);

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
    doc.text(`Generated on: ${formatReportTimestamp(new Date())} (Asia/Manila)`, 14, 22);
    doc.text(`Total records: ${data.length}`, 14, 27);

    const tableData = buildSlaPdfRows(data);

    autoTable(doc, {
      startY: 35,
      head: [["Reference", "Status", "Category", "Farm Operation", "Submitted (Manila)", "Staff response (Manila)", "Time", "SLA"]],
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
