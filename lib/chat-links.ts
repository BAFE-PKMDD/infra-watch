const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const YEAR_PREFIXED_ID_PATTERN = /^\d{4}-/;
const NUMERIC_ID_PATTERN = /^\d{3,20}$/;

function isSafeProjectIdentifier(identifier: string) {
  if (!identifier || identifier.length > 160 || /[\u0000-\u001f\u007f]/.test(identifier)) {
    return false;
  }

  return !identifier
    .split(/[\\/]/)
    .some((segment) => segment === "." || segment === "..");
}

export function getProjectHref(identifier: string): string | null {
  const normalized = identifier.trim();

  if (
    !UUID_PATTERN.test(normalized) &&
    !NUMERIC_ID_PATTERN.test(normalized) &&
    !(YEAR_PREFIXED_ID_PATTERN.test(normalized) && isSafeProjectIdentifier(normalized))
  ) {
    return null;
  }

  return `/projects/${encodeURIComponent(normalized)}`;
}

export function isProjectHref(href: string | undefined): href is string {
  if (!href?.startsWith("/projects/")) return false;

  const encodedIdentifier = href.slice("/projects/".length);
  if (!encodedIdentifier || encodedIdentifier.includes("/") || encodedIdentifier.includes("?")) {
    return false;
  }

  try {
    const identifier = decodeURIComponent(encodedIdentifier);
    return (
      isSafeProjectIdentifier(identifier) &&
      `/projects/${encodeURIComponent(identifier)}` === href
    );
  } catch {
    return false;
  }
}
