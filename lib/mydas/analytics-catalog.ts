import type { MydasDisplayType } from "@/types/mydas.types";

// Single source of truth for what MYDAS can chart. The AI prompt's chart options and
// the "what analytics can you generate" answer are both built from this list, so the
// answer can't drift from the charts the designer actually renders.
export interface MydasCatalogEntry {
  type: MydasDisplayType;
  label: string;
  description: string;
  example: string;
  queryGuidance: string;
}

export const MYDAS_ANALYTICS_CATALOG: MydasCatalogEntry[] = [
  {
    type: "bar",
    label: "Horizontal bars",
    description: "Ranking or comparison across categories.",
    example: "What are the top 10 provinces by total project budget?",
    queryGuidance: "One label column and one value column. For rankings use ORDER BY the value DESC with a LIMIT.",
  },
  {
    type: "column",
    label: "Vertical columns",
    description: "Comparison across a short list of categories, such as months or years.",
    example: "How many issues were reported per month this year?",
    queryGuidance: "One label column and one value column, ordered by the category.",
  },
  {
    type: "line",
    label: "Line",
    description: "Trend over time.",
    example: "How has the number of feedback submissions changed by month?",
    queryGuidance: "Label is the time period in ascending order, value is the measure for that period.",
  },
  {
    type: "area",
    label: "Area",
    description: "Volume trend over time.",
    example: "How many projects were started each year?",
    queryGuidance: "Label is the time period in ascending order, value is the measure for that period.",
  },
  {
    type: "pie",
    label: "Pie",
    description: "Part-of-whole breakdown with at most 6 categories.",
    example: "What share of projects is in each status?",
    queryGuidance: "One label column and one value column with at most 6 rows.",
  },
  {
    type: "donut",
    label: "Donut",
    description: "Part-of-whole breakdown with at most 6 categories, drawn as a ring.",
    example: "What share of feedback is positive versus negative?",
    queryGuidance: "Same shape as a pie chart: one label column and one value column with at most 6 rows.",
  },
  {
    type: "stacked-bar-100",
    label: "100% stacked horizontal bars",
    description: "The mix of a second dimension within each category, shown as proportions.",
    example: "What is the status mix of projects in each region?",
    queryGuidance:
      "Label is the category. Add one value column per segment, each computed with COUNT(*) FILTER (WHERE ...) or SUM(...) FILTER (WHERE ...), so the segments are the mix of a second dimension.",
  },
  {
    type: "stacked-column",
    label: "Stacked columns",
    description: "Totals per category split into parts, drawn vertically.",
    example: "How many issues per province are open versus resolved?",
    queryGuidance:
      "Label is the category. Add one value column per segment, each computed with COUNT(*) FILTER (WHERE ...) or SUM(...) FILTER (WHERE ...).",
  },
  {
    type: "heatmap",
    label: "Highlight table (heatmap)",
    description: "A matrix of categories by a second dimension, where cell color shows the size of each value.",
    example: "Show a heatmap of issue categories by region.",
    queryGuidance:
      "Label is the row category. Add one value column per column category, computed with COUNT(*) FILTER (WHERE ...).",
  },
  {
    type: "range",
    label: "Range chart with median",
    description: "Minimum, median, and maximum of a numeric measure for each category.",
    example: "What is the range and median of project durations by region?",
    queryGuidance:
      "Label is the category. Return exactly three value columns in this order: minimum, median, maximum. Use PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ...) for the median.",
  },
  {
    type: "trend",
    label: "Trend with projection",
    description:
      "Historical trend over time with a straight-line projection for the next three periods. It's a rough estimate from past values, not a forecast model.",
    example: "Project how many projects will be started over the next three years.",
    queryGuidance:
      "Label is the time period in ascending order, at most 9 periods. Exactly one value column with the measure for each period.",
  },
  {
    type: "kpi",
    label: "KPI cards",
    description: "Headline numbers such as totals, averages, and rates.",
    example: "What is the total approved budget?",
    queryGuidance:
      "One row per metric. Label is the metric name, and there is exactly one value column with the number.",
  },
];

export function buildCatalogAnswer(intro: string): string {
  const lines = MYDAS_ANALYTICS_CATALOG.map(
    (entry) => `- ${entry.label}: ${entry.description} Example: "${entry.example}"`,
  );
  return [intro, "", ...lines].join("\n");
}
