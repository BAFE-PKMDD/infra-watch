export interface ProjectLengthDisplayInput {
  projectLength?: string | null;
  postGeotaggedLength?: string | null;
}

export interface ProjectLengthDisplay {
  source: "post-geotagged" | "target";
  value: string;
}

const STRICT_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const NUMBER_WITH_UNIT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s+[^\d\s].*$/;

function finiteNonNegativeNumber(value: string | null | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized || !STRICT_NUMBER.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function targetLengthValue(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) return "Unavailable";

  const numericValue = finiteNonNegativeNumber(normalized);
  if (numericValue !== null) return `${numericValue.toFixed(2)} km`;

  // Preserve a source-provided unit instead of relabeling it as kilometers.
  // Any malformed or placeholder value gets an explicit unavailable state.
  return NUMBER_WITH_UNIT.test(normalized) ? normalized : "Unavailable";
}

export function getProjectLengthDisplay({
  projectLength,
  postGeotaggedLength,
}: ProjectLengthDisplayInput): ProjectLengthDisplay {
  const postGeotaggedValue = finiteNonNegativeNumber(postGeotaggedLength);
  if (postGeotaggedValue !== null) {
    return {
      source: "post-geotagged",
      value: `${postGeotaggedValue.toFixed(2)} km`,
    };
  }

  return {
    source: "target",
    value: targetLengthValue(projectLength),
  };
}
