import { z } from "zod";

export const BannerSettingsSchema = z.object({
  isEnabled: z.boolean().default(false),
  message: z.string().min(1, "Message is required").max(500, "Message is too long"),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").default("#10b981"),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").default("#ffffff"),
  hideOnScroll: z.boolean().default(false),
});

export type BannerSettings = z.infer<typeof BannerSettingsSchema>;
