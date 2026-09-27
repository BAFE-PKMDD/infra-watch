import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CompletionDelayHistogram } from "./completion-delay-histogram";
import { ContractorTrackRecordTable } from "./contractor-track-record-table";
import { LateDaysByDimensionChart } from "./late-days-by-dimension-chart";
import { LateRateByContractLengthChart } from "./late-rate-by-contract-length-chart";
import { LateRateByYearChart } from "./late-rate-by-year-chart";
import { NtpLagChart } from "./ntp-lag-chart";
import { OngoingByYearChart, OngoingOverdueBucketsChart } from "./ongoing-overdue-chart";
import { ProcurementModeChart } from "./procurement-mode-chart";
import { TurnoverBacklogChart } from "./turnover-backlog-chart";

function render(component: React.ReactElement) {
  return renderToStaticMarkup(component);
}

test("ProcurementModeChart renders budget by procurement mode and an unavailable state", () => {
  const html = render(createElement(ProcurementModeChart, {
    data: [
      { mode: "Public Bidding", total: 6361, allocatedBudget: 12_283_497_340 },
      { mode: "Unknown", total: 10, allocatedBudget: 5_000 },
    ],
  }));
  assert.match(html, /Budget by way of buying/);
  assert.match(html, /Public Bidding/);
  assert.doesNotMatch(html, />Unknown</);

  const unavailable = render(createElement(ProcurementModeChart, { data: undefined }));
  assert.match(unavailable, /Procurement-mode data is unavailable/);
});

test("CompletionDelayHistogram shows bucket counts and percentages", () => {
  const html = render(createElement(CompletionDelayHistogram, {
    data: [
      { bucket: "onTimeOrEarly", count: 597 },
      { bucket: "late1to30", count: 516 },
      { bucket: "late31to90", count: 779 },
      { bucket: "late91to180", count: 513 },
      { bucket: "late181to365", count: 330 },
      { bucket: "lateOver365", count: 61 },
    ],
  }));
  assert.match(html, /Did construction finish on time\?/);
  assert.match(html, /On time or early/);
  assert.match(html, /2,796 completed projects/);
});

test("LateDaysByDimensionChart filters out dimensions with no computable median", () => {
  const html = render(createElement(LateDaysByDimensionChart, {
    data: [
      { key: "Region X", medianLateDays: 105, lateCount: 40, totalWithDates: 60 },
      { key: "Region Y", medianLateDays: null, lateCount: 0, totalWithDates: 2 },
    ],
    dimensionLabel: "region",
  }));
  assert.match(html, /How late projects usually finish, per region/);
  assert.match(html, /Region X/);
  assert.doesNotMatch(html, /Region Y/);
});

test("LateRateByContractLengthChart converts counts to a rate per 100", () => {
  const html = render(createElement(LateRateByContractLengthChart, {
    data: [
      { bucket: "30orLess", lateCount: 93, total: 100 },
      { bucket: "over180", lateCount: 34, total: 100 },
    ],
  }));
  assert.match(html, /Short contracts are late more often/);
  assert.match(html, /30 days or less/);
});

test("LateRateByYearChart excludes Unknown funding years", () => {
  const html = render(createElement(LateRateByYearChart, {
    data: [
      { yearFunded: "2021", lateCount: 88, total: 100 },
      { yearFunded: "Unknown", lateCount: 1, total: 2 },
    ],
  }));
  assert.match(html, /Late projects, by budget year/);
  assert.match(html, /2021/);
});

test("NtpLagChart renders a range-dot row per procurement mode", () => {
  const html = render(createElement(NtpLagChart, {
    data: [
      { mode: "Fund Transfer", medianDays: 277, p25Days: 250, p75Days: 300 },
      { mode: "Unknown", medianDays: 10, p25Days: 5, p75Days: 15 },
    ],
  }));
  assert.match(html, /How long before construction can start/);
  assert.match(html, /Fund Transfer/);
  assert.doesNotMatch(html, />Unknown</);
});

test("OngoingOverdueBucketsChart and OngoingByYearChart render their totals", () => {
  const buckets = render(createElement(OngoingOverdueBucketsChart, {
    data: [
      { bucket: "notYetDue", zeroProgress: 10, someProgress: 2 },
      { bucket: "under6mo", zeroProgress: 30, someProgress: 10 },
      { bucket: "6to12mo", zeroProgress: 20, someProgress: 5 },
      { bucket: "1to2yr", zeroProgress: 15, someProgress: 5 },
      { bucket: "over2yr", zeroProgress: 40, someProgress: 5 },
      { bucket: "noDates", zeroProgress: 500, someProgress: 20 },
    ],
  }));
  assert.match(buckets, /How far past the deadline are ongoing projects\?/);

  const byYear = render(createElement(OngoingByYearChart, {
    data: [{ yearFunded: "2022", zeroProgress: 180, someProgress: 30 }],
  }));
  assert.match(byYear, /Ongoing projects, by budget year/);
  assert.match(byYear, /2022/);
});

test("TurnoverBacklogChart shows the over-a-year callout and per-region table", () => {
  const html = render(createElement(TurnoverBacklogChart, {
    data: {
      buckets: [
        { bucket: "under6mo", count: 33 },
        { bucket: "6to12mo", count: 37 },
        { bucket: "1to2yr", count: 62 },
        { bucket: "2to4yr", count: 226 },
        { bucket: "over4yr", count: 388 },
      ],
      byRegion: [
        { region: "CAR", waiting: 308, waitingOver1Year: 194, allocatedBudget: 180_000_000 },
      ],
    },
  }));
  assert.match(html, /Waiting for turn-over/);
  assert.match(html, /676/);
  assert.match(html, /CAR/);
});

test("ContractorTrackRecordTable filters by the minimum-projects default and shows the caution note", () => {
  const html = render(createElement(ContractorTrackRecordTable, {
    data: [
      { name: "GLF Builders", projectsChecked: 19, medianLateDays: 84, latePct: 100, overThreeMonthsLatePct: 37, contractValue: 27_900_000, regionCount: 1, mostlyBuilds: "Solar-Powered Irrigation System" },
      { name: "Too Small Co", projectsChecked: 3, medianLateDays: 5, latePct: 50, overThreeMonthsLatePct: 0, contractValue: 100_000, regionCount: 1, mostlyBuilds: null },
    ],
  }));
  assert.match(html, /Contractor track record/);
  assert.match(html, /GLF Builders/);
  assert.doesNotMatch(html, /Too Small Co/);
  assert.match(html, /Read with care/);
});
