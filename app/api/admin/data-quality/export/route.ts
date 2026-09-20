import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";

import {
  EXPORT_FIELD_ORDER,
  FIELD_ABEMIS_NAMES,
  formatFieldValueForField,
  ISSUE_LABELS,
} from "@/lib/data-quality/format";
import { getDataQualityExportRows } from "@/lib/data-quality/service";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INCORRECT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8CBAD" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const ID_COL = 1;
const PROJECT_ID_COL = 2;
const PROJECT_NAME_COL = 3;
const ORIGINAL_START_COL = 4;
const ORIGINAL_END_COL = ORIGINAL_START_COL + EXPORT_FIELD_ORDER.length - 1;
const FINDING_COL = ORIGINAL_END_COL + 1;
const NEW_VALUE_START_COL = FINDING_COL + 1;
const NEW_VALUE_END_COL = NEW_VALUE_START_COL + EXPORT_FIELD_ORDER.length - 1;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission(user.role as string | null | undefined, "data_quality", "view");

    const params = request.nextUrl.searchParams;
    const rows = await getDataQualityExportRows({
      type: params.get("type") ?? undefined,
      search: params.get("search") ?? undefined,
    }, user);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "INFRA Watch";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Data quality corrections");
    buildHeader(sheet);

    let rowNumber = 3;
    for (const row of rows) {
      const excelRow = sheet.getRow(rowNumber);
      excelRow.getCell(ID_COL).value = row.project.abemisRawId ?? "";
      excelRow.getCell(PROJECT_ID_COL).value = row.project.abemisId;
      excelRow.getCell(PROJECT_NAME_COL).value = row.project.name;

      const fieldValues = new Map<string, string>();
      for (const issue of row.findings) {
        const abemisName = FIELD_ABEMIS_NAMES[issue.field];
        if (!abemisName) continue;
        fieldValues.set(abemisName, formatFieldValueForField(issue));
      }

      EXPORT_FIELD_ORDER.forEach((fieldName, index) => {
        const value = fieldValues.get(fieldName);
        if (value === undefined) return;
        const cell = excelRow.getCell(ORIGINAL_START_COL + index);
        cell.value = value;
        cell.fill = INCORRECT_FILL;
      });

      excelRow.getCell(FINDING_COL).value = row.findings.map((issue) => ISSUE_LABELS[issue.type]).join(", ");

      for (let col = ID_COL; col <= NEW_VALUE_END_COL; col++) {
        excelRow.getCell(col).border = THIN_BORDER;
      }

      rowNumber += 1;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `data-quality-corrections-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({
      error: status === 403 ? "Forbidden" : "Failed to export project data",
    }, { status });
  }
}

function buildHeader(sheet: ExcelJS.Worksheet) {
  sheet.mergeCells(1, ID_COL, 2, ID_COL);
  sheet.mergeCells(1, PROJECT_ID_COL, 2, PROJECT_ID_COL);
  sheet.mergeCells(1, PROJECT_NAME_COL, 2, PROJECT_NAME_COL);
  sheet.mergeCells(1, ORIGINAL_START_COL, 1, ORIGINAL_END_COL);
  sheet.mergeCells(1, FINDING_COL, 2, FINDING_COL);
  sheet.mergeCells(1, NEW_VALUE_START_COL, 1, NEW_VALUE_END_COL);

  sheet.getCell(1, ID_COL).value = "id";
  sheet.getCell(1, PROJECT_ID_COL).value = "project_id";
  sheet.getCell(1, PROJECT_NAME_COL).value = "Project Name";
  sheet.getCell(1, ORIGINAL_START_COL).value = "Original";
  sheet.getCell(1, FINDING_COL).value = "Finding";
  sheet.getCell(1, NEW_VALUE_START_COL).value = "New Value";

  EXPORT_FIELD_ORDER.forEach((fieldName, index) => {
    sheet.getCell(2, ORIGINAL_START_COL + index).value = fieldName;
    sheet.getCell(2, NEW_VALUE_START_COL + index).value = fieldName;
  });

  for (let col = ID_COL; col <= NEW_VALUE_END_COL; col++) {
    for (let r = 1; r <= 2; r++) {
      const cell = sheet.getCell(r, col);
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = THIN_BORDER;
    }
  }

  sheet.getColumn(ID_COL).width = 12;
  sheet.getColumn(PROJECT_ID_COL).width = 32;
  sheet.getColumn(PROJECT_NAME_COL).width = 38;
  sheet.getColumn(FINDING_COL).width = 48;
  for (let i = 0; i < EXPORT_FIELD_ORDER.length; i++) {
    sheet.getColumn(ORIGINAL_START_COL + i).width = 16;
    sheet.getColumn(NEW_VALUE_START_COL + i).width = 16;
  }

  sheet.views = [{ state: "frozen", xSplit: PROJECT_NAME_COL, ySplit: 2 }];
}

function getErrorStatus(error: unknown) {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    return error.status;
  }
  return 500;
}
