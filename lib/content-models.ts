import { z } from "zod";

export const CONTENT_KINDS = [
  "articles",
  "announcements",
  "map-layers",
] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];
export type ManagedRecord = { id: string } & Record<string, unknown>;
export type ManagedList = {
  data: ManagedRecord[];
  total: number;
  page: number;
  pageSize: number;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "Use an HTTP or HTTPS URL");
const optionalUrl = z
  .union([httpUrl, z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);
const dateValue = z
  .union([z.iso.datetime(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? new Date(value) : null));

export const articleInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  url: httpUrl,
  source: z.string().trim().min(1).max(160),
  category: z.enum([
    "news",
    "publication",
    "research",
    "announcement",
    "report",
  ]),
  excerpt: optionalText(3000),
  thumbnail: optionalUrl,
  thumbnailAlt: optionalText(300),
  author: optionalText(160),
  publishedDate: dateValue,
  projectId: optionalText(160),
  tags: z
    .union([
      z.array(z.string().trim().min(1).max(60)).max(20),
      z
        .string()
        .max(1200)
        .transform((value) =>
          value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
    ])
    .default([])
    .pipe(z.array(z.string().max(60)).max(20)),
});

export const announcementInputSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    content: z.string().trim().min(1).max(20000),
    isActive: z.boolean().default(false),
    startDate: dateValue,
    endDate: dateValue,
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.endDate > value.startDate,
    { message: "End date must be after the start date", path: ["endDate"] },
  );

export const mapLayerInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: optionalText(1000),
  geoserverUrl: httpUrl,
  workspace: z.string().trim().min(1).max(160),
  layerName: z.string().trim().min(1).max(255),
  styleName: optionalText(160),
  opacity: z.number().min(0).max(1).default(0.7),
  displayOrder: z.number().int().min(0).max(10000).default(0),
  legendShape: z
    .enum(["circle", "square", "line", "triangle", "diamond", "polygon"])
    .default("circle"),
  legendColor: z
    .string()
    .regex(/^#[a-f\d]{6}$/i, "Use a six-digit hex color")
    .default("#10b981"),
  isActive: z.boolean().default(true),
});

export function getAnnouncementStatus(
  record: {
    isActive: boolean;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  },
  now = new Date(),
) {
  if (record.endDate && new Date(record.endDate) < now) return "Expired";
  if (!record.isActive) return "Inactive";
  if (record.startDate && new Date(record.startDate) > now) return "Scheduled";
  return "Active";
}
