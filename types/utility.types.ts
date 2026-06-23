/**
 * Utility type definitions
 * Common types used across various utilities and libraries
 */

// Cache-related types
export interface CacheOptions {
  /**
   * Time to live in seconds
   */
  ttl?: number;

  /**
   * Cache key prefix
   */
  prefix?: string;
}

// Analytics-related types
export type AnalyticsEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
};

// Logging-related types
export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogOptions {
  context?: string;
  metadata?: Record<string, unknown>;
}
