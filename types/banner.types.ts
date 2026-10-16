import { z } from "zod";

export const BannerSettingsSchema = z.object({
  isEnabled: z.boolean().default(false),
  message: z.string().trim().min(1, "Message is required").max(300, "Message must be 300 characters or fewer"),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").default("#047857"),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").default("#ffffff"),
});

export type BannerSettings = z.infer<typeof BannerSettingsSchema>;

// Emerald-700 with white text meets the 4.5:1 contrast the banner editor enforces.
export const DEFAULT_BANNER_SETTINGS: BannerSettings = {
  isEnabled: false,
  message: "Check out the latest infrastructure projects on InfraWatch.",
  backgroundColor: "#047857",
  textColor: "#ffffff",
};
