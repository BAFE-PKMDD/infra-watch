import { z } from "zod";

const chartDatumSchema = z.object({
  label: z.string().trim().min(1).max(48),
  value: z.number().finite().nonnegative(),
});

const chartSpecSchema = z.object({
  type: z.enum(["bar", "pie"]),
  title: z.string().trim().min(1).max(100),
  valueLabel: z.string().trim().min(1).max(40).optional(),
  valuePrefix: z.string().max(4).optional(),
  valueSuffix: z.string().max(12).optional(),
  data: z.array(chartDatumSchema).min(1).max(12),
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

export function parseChartSpec(source: string): ChartSpec | null {
  try {
    const parsed: unknown = JSON.parse(source.trim());
    const result = chartSpecSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
