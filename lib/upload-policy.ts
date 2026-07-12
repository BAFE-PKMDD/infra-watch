export const DEFAULT_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const DEFAULT_ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const UPLOAD_ACCEPT = [...DEFAULT_ALLOWED_IMAGE_TYPES, ...DEFAULT_ALLOWED_VIDEO_TYPES].join(",");

export const IMAGE_EXTENSIONS_BY_TYPE: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/jpg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
};

export const VIDEO_EXTENSIONS_BY_TYPE: Record<string, string[]> = {
  "video/mp4": ["mp4"],
  "video/quicktime": ["mov", "qt"],
  "video/webm": ["webm"],
};

export const EXTENSIONS_BY_TYPE: Record<string, string[]> = {
  ...IMAGE_EXTENSIONS_BY_TYPE,
  ...VIDEO_EXTENSIONS_BY_TYPE,
};

export function isAllowedClientUploadType(type: string) {
  return UPLOAD_ACCEPT.split(",").includes(type);
}

export function uploadKindFromType(type: string): "image" | "video" | null {
  if (Object.hasOwn(IMAGE_EXTENSIONS_BY_TYPE, type)) return "image";
  if (Object.hasOwn(VIDEO_EXTENSIONS_BY_TYPE, type)) return "video";
  return null;
}
