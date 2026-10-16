"use server";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { AutoReplySettings, DEFAULT_AUTO_REPLY_SETTINGS } from "@/types/auto-reply.types";
import type { BannerSettings } from "@/types/banner.types";
import {
  BANNER_SETTING_KEY,
  MAINTENANCE_SETTING_KEY,
  parseBannerSettings,
  parseMaintenanceValue,
} from "@/lib/site-notices";

/**
 * Fetch a system setting by key.
 * No auth check here — this is also read by the public issue-submission flow
 * to decide whether auto-accept is enabled.
 */
export const getSystemSetting = cache(async (key: string) => {
  try {
    const [setting] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    return { success: true, data: setting?.value ?? null };
  } catch (error) {
    console.error("Error fetching system setting", { key, error });
    return { success: false, error: "Failed to fetch setting", data: null };
  }
});

/**
 * Fetch auto-reply/auto-accept settings, merged over defaults.
 */
export const getAutoReplySettings = cache(async (): Promise<{ success: boolean; data: AutoReplySettings; error?: string }> => {
  try {
    const result = await getSystemSetting("auto_reply_config");

    if (!result.success || !result.data) {
      return { success: true, data: DEFAULT_AUTO_REPLY_SETTINGS };
    }

    return {
      success: true,
      data: {
        ...DEFAULT_AUTO_REPLY_SETTINGS,
        ...(result.data as Partial<AutoReplySettings>),
      },
    };
  } catch (error) {
    console.error("Error fetching auto-reply settings", error);
    return { success: false, error: "Failed to fetch auto-reply settings", data: DEFAULT_AUTO_REPLY_SETTINGS };
  }
});

/**
 * Whether maintenance mode is on. Public (the site notice endpoint reads it), and a failed
 * read counts as "off" so a database hiccup never locks everyone out.
 */
export const getMaintenanceMode = cache(async (): Promise<{ success: boolean; data: boolean; error?: string }> => {
  const result = await getSystemSetting(MAINTENANCE_SETTING_KEY);
  if (!result.success) {
    return { success: false, data: false, error: "Failed to fetch maintenance mode" };
  }
  return { success: true, data: parseMaintenanceValue(result.data) };
});

/**
 * Public banner settings, merged over the defaults. Public for the same reason as above.
 */
export const getBannerSettings = cache(async (): Promise<{ success: boolean; data: BannerSettings; error?: string }> => {
  const result = await getSystemSetting(BANNER_SETTING_KEY);
  if (!result.success) {
    return { success: false, data: parseBannerSettings(null), error: "Failed to fetch banner settings" };
  }
  return { success: true, data: parseBannerSettings(result.data) };
});
