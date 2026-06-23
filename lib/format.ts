/**
 * Currency Formatting Utilities
 */

export function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatNumber(value: number) {
  return value.toLocaleString("en-PH");
}

export function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

/**
 * Format budget with custom compact notation (B/M/K)
 * Used in statistics cards
 */
export function formatBudgetCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `₱${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `₱${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `₱${(amount / 1_000).toFixed(2)}K`;
  }
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format budget for display (no decimals by default)
 * Returns "N/A" if amount is null/undefined
 */
export function formatBudget(amount: number | null | undefined): string {
  if (!amount) return "N/A";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format budget for detailed views (with decimals)
 */
export function formatBudgetDetailed(amount: number | null | undefined): string {
  if (!amount) return "Not specified";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Location Formatting Utilities
 */

/**
 * Format location from project data (barangay, municipality, region/province)
 * Used in project tables and details
 */
export function formatLocation(
  location: {
    barangay?: string | null;
    municipality?: string | null;
    province?: string | null;
    region?: string | null;
  }
): string {
  const parts = [
    location.barangay,
    location.municipality,
    location.region || location.province
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "N/A";
}

/**
 * Time/Duration Formatting Utilities
 */

/**
 * Format duration in milliseconds to human-readable format
 * Returns format like "2m 30s" or "45s"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "N/A";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}
