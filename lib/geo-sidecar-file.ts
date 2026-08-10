export const MAX_GPS_INFO_BYTES = 10 * 1024 * 1024;
export const GPS_INFO_ACCEPT = ".gps.info,.info";

type DaPairName = {
  base: string;
  copyIndex: number | null;
};

const WINDOWS_COPY_SUFFIX = /\s*(?:\[([1-9]\d{0,2})\]|\(([1-9]\d{0,2})\))$/;
const DA_GPS_ROLE = /^(.*?)[._]gps(?:\s*(?:\[([1-9]\d{0,2})\]|\(([1-9]\d{0,2})\)))?$/i;

function normalizedFilename(filename: string) {
  return filename.normalize("NFKC").trim().toLowerCase();
}

function normalizeBase(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function splitWindowsCopySuffix(value: string) {
  const match = WINDOWS_COPY_SUFFIX.exec(value);
  if (!match) return { base: value, copyIndex: null };
  return {
    base: value.slice(0, match.index),
    copyIndex: Number(match[1] ?? match[2]),
  };
}

function parseGpsInfoName(filename: string): DaPairName | null {
  const value = normalizedFilename(filename);
  if (!value.endsWith(".info")) return null;

  const role = DA_GPS_ROLE.exec(value.slice(0, -".info".length));
  if (!role) return null;

  const baseCopy = splitWindowsCopySuffix(role[1]);
  const roleCopyIndex = role[2] ?? role[3];
  if (roleCopyIndex !== undefined && baseCopy.copyIndex !== null) return null;

  const base = normalizeBase(baseCopy.base);
  if (!base) return null;
  return {
    base,
    copyIndex: roleCopyIndex === undefined ? baseCopy.copyIndex : Number(roleCopyIndex),
  };
}

function parseMp4Name(filename: string): DaPairName | null {
  const value = normalizedFilename(filename);
  if (!value.endsWith(".mp4")) return null;
  const parsed = splitWindowsCopySuffix(value.slice(0, -".mp4".length));
  const base = normalizeBase(parsed.base);
  return base ? { base, copyIndex: parsed.copyIndex } : null;
}

export function isGpsInfoSidecar(file: Pick<File, "name">) {
  return parseGpsInfoName(file.name) !== null;
}

export function isDaGeoCameraVideo(file: Pick<File, "name">) {
  return parseMp4Name(file.name) !== null;
}

/** Returns the shared filename stem used to pair a video with its GPS sidecar. */
export function geoEvidencePairingKey(filename: string) {
  const parsed = parseGpsInfoName(filename) ?? parseMp4Name(filename);
  if (!parsed) return `unsupported:${normalizedFilename(filename)}`;
  return `${parsed.base}\u0000copy:${parsed.copyIndex ?? "original"}`;
}
