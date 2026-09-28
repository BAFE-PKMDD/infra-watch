import type { PublicStageKey } from "@/lib/public-analytics/rules";
import { format, formatCount, type PublicAnalyticsStrings } from "@/lib/public-analytics/strings";

import { STAGE_COLOR, STAGE_DISPLAY_ORDER } from "./stage-colors";

export function StageSwatch({ stage }: { stage: PublicStageKey }) {
  return <span aria-hidden="true" className="inline-block size-3.5 shrink-0 rounded-sm" style={{ background: STAGE_COLOR[stage] }} />;
}

/**
 * One stacked bar of the five public stages, with a legend that carries the numbers.
 * Rendered on the server, so it takes the strings for the visitor's language as a prop.
 */
export function StageBar({ rows, t }: { rows: Array<{ label: PublicStageKey; projects: number }>; t: PublicAnalyticsStrings }) {
  const total = rows.reduce((sum, row) => sum + row.projects, 0);
  const ordered = STAGE_DISPLAY_ORDER.map((stage) => rows.find((row) => row.label === stage) ?? { label: stage, projects: 0 });

  if (total === 0) return <p className="text-base text-pa-ink-2">{t.chart.emptyChart}</p>;

  return (
    <div>
      <div className="flex h-6 w-full gap-[2px] overflow-hidden" aria-hidden="true">
        {ordered.filter((row) => row.projects > 0).map((row, index, visible) => (
          <span
            key={row.label}
            className={index === visible.length - 1 ? "rounded-r" : undefined}
            style={{ flexGrow: row.projects, flexBasis: 0, minWidth: 3, background: STAGE_COLOR[row.label] }}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {ordered.map((row) => {
          const perHundred = Math.round((row.projects / total) * 100);
          return (
            <li key={row.label} className="flex items-start gap-2 text-base text-pa-ink">
              <span className="mt-1.5"><StageSwatch stage={row.label} /></span>
              <span>
                <span className="font-medium">{t.stages[row.label]}</span>
                <span className="text-pa-ink-2">
                  {" "}· {formatCount(row.projects)}
                  {row.projects > 0 ? ` (${format(t.chart.outOf, { part: perHundred < 1 ? t.chart.lessThanOne : perHundred })})` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
