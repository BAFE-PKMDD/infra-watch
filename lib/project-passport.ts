export function calculateProjectPassportCoverage(values: unknown[]) {
  const available = values.filter((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  }).length;
  return { available, total: values.length };
}

export function formatPublicSyncDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}
