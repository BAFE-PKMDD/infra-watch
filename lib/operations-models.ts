import { z } from "zod";
import { PHILIPPINE_REGIONS } from "@/lib/philippines-regions";

export function videoSampleTimes(duration: number, count = 8) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 24 * 60 * 60)
    throw new Error("Video duration cannot be assessed");
  return Array.from(
    { length: count },
    (_, index) => (duration * (index + 0.5)) / count,
  );
}

export const notificationPreferencesSchema = z
  .object({ inApp: z.boolean(), email: z.boolean(), sms: z.boolean() })
  .strict();
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true,
  email: false,
  sms: false,
};

export const commodityOverrideSchema = z
  .object({
    commodities: z
      .array(z.string().trim().min(1).max(80))
      .max(30)
      .transform((values) => [...new Set(values)]),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();

const observedCount = z.number().int().min(0).max(10_000_000).nullable();
const observedAmount = z
  .number()
  .finite()
  .min(0)
  .max(999_999_999_999_999)
  .nullable();
export const regionalStatisticSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    region: z
      .string()
      .refine(
        (value) =>
          PHILIPPINE_REGIONS.some((region) => region.displayName === value),
        "Select a Philippine region",
      ),
    program: z.enum(["AMEFIP", "INS"]),
    fundedProjects: observedCount,
    completedProjects: observedCount,
    ongoingProjects: observedCount,
    notYetStartedProjects: observedCount,
    suspendedProjects: observedCount,
    allocatedAmount: observedAmount,
    lengthCompleted: z.number().finite().min(0).max(10_000_000).nullable(),
    sourceName: z.string().trim().min(2).max(200),
    sourceUrl: z
      .url()
      .max(2048)
      .refine(
        (value) => /^https?:\/\//.test(value),
        "Use an HTTP or HTTPS source",
      ),
    asOf: z.iso.date(),
    isPublished: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    const assessed = [
      value.completedProjects,
      value.ongoingProjects,
      value.notYetStartedProjects,
      value.suspendedProjects,
    ];
    if (
      value.fundedProjects !== null &&
      assessed.reduce<number>((sum, count) => sum + (count ?? 0), 0) >
        value.fundedProjects
    ) {
      context.addIssue({
        code: "custom",
        path: ["fundedProjects"],
        message: "Status counts cannot exceed funded projects",
      });
    }
  });

export const JOB_KINDS = [
  "abemis-sync",
  "location-sync",
  "media-moderation",
  "notification-delivery",
] as const;
export type JobKind = (typeof JOB_KINDS)[number];
export function retryDelay(attempt: number) {
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 15 * 60_000);
}

export const UPLOAD_PART_SIZE = 50 * 1024 * 1024;
export const MAX_DIRECT_UPLOAD_SIZE = 20 * 1024 * 1024 * 1024;
export const directUploadSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    type: z.enum(["video/mp4", "video/quicktime", "video/webm"]),
    size: z.number().int().min(1).max(MAX_DIRECT_UPLOAD_SIZE),
  })
  .strict();

export function validateUploadParts(
  size: number,
  parts: { partNumber: number; etag: string }[],
) {
  const expected = Math.ceil(size / UPLOAD_PART_SIZE);
  if (
    parts.length !== expected ||
    parts.some(
      (part, index) =>
        part.partNumber !== index + 1 ||
        !/^[a-f\d]{32}(?:-\d+)?$/i.test(part.etag),
    )
  ) {
    throw Object.assign(new Error("Upload parts are incomplete or invalid"), {
      status: 400,
    });
  }
}
