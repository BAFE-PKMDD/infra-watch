import "server-only";

import {
  DEFAULT_ALLOWED_IMAGE_TYPES,
  DEFAULT_ALLOWED_VIDEO_TYPES,
  EXTENSIONS_BY_TYPE,
  IMAGE_EXTENSIONS_BY_TYPE,
  VIDEO_EXTENSIONS_BY_TYPE,
  uploadKindFromType,
} from "@/lib/upload-policy";

const MAX_HEADER_BYTES = 64;
const MAX_IMAGE_SIZE = Number(process.env.MAX_IMAGE_SIZE || 5 * 1024 * 1024);
const MAX_VIDEO_SIZE = Number(process.env.MAX_VIDEO_SIZE || 50 * 1024 * 1024);

function parseAllowedTypes(envName: string, defaults: readonly string[]) {
  const configured = process.env[envName]
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configured && configured.length > 0 ? configured : defaults);
}

export const ALLOWED_IMAGE_TYPES = parseAllowedTypes("ALLOWED_IMAGE_TYPES", DEFAULT_ALLOWED_IMAGE_TYPES);
export const ALLOWED_VIDEO_TYPES = parseAllowedTypes("ALLOWED_VIDEO_TYPES", DEFAULT_ALLOWED_VIDEO_TYPES);
export const ALLOWED_FILE_TYPES = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]);

type UploadValidationResult = {
  kind: "image" | "video";
  contentType: string;
  safeExtension: string;
  maxSize: number;
};

function getExtension(name: string) {
  const cleanName = name.toLowerCase().split("?")[0].split("#")[0];
  const extension = cleanName.includes(".") ? cleanName.split(".").pop() : "";
  return (extension || "").replace(/[^a-z0-9]/g, "");
}

function hasAllowedExtension(fileName: string, mimeType: string) {
  const extension = getExtension(fileName);
  return Boolean(extension && EXTENSIONS_BY_TYPE[mimeType]?.includes(extension));
}

async function readHeader(file: File) {
  return new Uint8Array(await file.slice(0, MAX_HEADER_BYTES).arrayBuffer());
}

function bytesMatch(header: Uint8Array, offset: number, bytes: number[]) {
  if (header.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => header[offset + index] === byte);
}

function asciiAt(header: Uint8Array, offset: number, length: number) {
  if (header.length < offset + length) return "";
  return String.fromCharCode(...header.slice(offset, offset + length));
}

function hasValidMagicBytes(header: Uint8Array, mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return bytesMatch(header, 0, [0xff, 0xd8, 0xff]);
    case "image/png":
      return bytesMatch(header, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif":
      return bytesMatch(header, 0, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || bytesMatch(header, 0, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    case "image/webp":
      return bytesMatch(header, 0, [0x52, 0x49, 0x46, 0x46]) && asciiAt(header, 8, 4) === "WEBP";
    case "video/webm":
      return bytesMatch(header, 0, [0x1a, 0x45, 0xdf, 0xa3]);
    case "video/mp4":
    case "video/quicktime":
      return asciiAt(header, 4, 4) === "ftyp";
    default:
      return false;
  }
}

export function isAllowedFolder(folder: string) {
  return /^[a-zA-Z0-9/_-]+$/.test(folder) && !folder.includes("..");
}

export async function validateUploadFile(file: File): Promise<UploadValidationResult> {
  const mimeType = file.type.toLowerCase();
  const kind = uploadKindFromType(mimeType);

  if (!kind || !ALLOWED_FILE_TYPES.has(mimeType)) {
    throw new Error("Invalid file type. Only JPG, PNG, WebP, GIF, MP4, MOV, or WebM files are allowed.");
  }

  if (!hasAllowedExtension(file.name, mimeType)) {
    throw new Error("Invalid file extension. The file extension must match an allowed image or video type.");
  }

  const maxSize = kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    throw new Error(`${kind === "video" ? "Video" : "Image"} size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit.`);
  }

  const header = await readHeader(file);
  if (!hasValidMagicBytes(header, mimeType)) {
    throw new Error("File content does not match an allowed image or video format. Upload rejected.");
  }

  return {
    kind,
    contentType: mimeType,
    safeExtension: (kind === "video" ? VIDEO_EXTENSIONS_BY_TYPE : IMAGE_EXTENSIONS_BY_TYPE)[mimeType][0],
    maxSize,
  };
}
