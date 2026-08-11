export function projectPreviewBudget(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}
