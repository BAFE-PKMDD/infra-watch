export interface GeoPhotoResult {
  lat: number | null;
  lon: number | null;
  hasGeoData: boolean;
}

type Coordinates = {
  lat: number;
  lon: number;
};

type TiffField = {
  type: number;
  count: number;
  valueOffset: number;
  byteLength: number;
};

const MAX_METADATA_BYTES = 16 * 1024 * 1024;
const MAX_IFD_ENTRIES = 4_096;
const TIFF_TYPE_SIZES: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1, // SBYTE
  7: 1, // UNDEFINED
  8: 2, // SSHORT
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

function emptyResult(): GeoPhotoResult {
  return { lat: null, lon: null, hasGeoData: false };
}

function isRangeValid(length: number, offset: number, size: number) {
  return (
    Number.isInteger(offset) &&
    Number.isInteger(size) &&
    offset >= 0 &&
    size >= 0 &&
    offset <= length &&
    size <= length - offset
  );
}

function bytesEqual(bytes: Uint8Array, offset: number, expected: readonly number[]) {
  return (
    isRangeValid(bytes.length, offset, expected.length) &&
    expected.every((value, index) => bytes[offset + index] === value)
  );
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  if (!isRangeValid(bytes.length, offset, length)) return "";

  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[offset + index]);
  }
  return value;
}

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
  if (!isRangeValid(bytes.length, offset, 4)) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number) {
  if (!isRangeValid(bytes.length, offset, 4)) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

function getTiffStart(bytes: Uint8Array, offset: number) {
  return ascii(bytes, offset, 6) === "Exif\0\0" ? offset + 6 : offset;
}

function parseTiffGps(bytes: Uint8Array, tiffOffset: number): Coordinates | null {
  if (!isRangeValid(bytes.length, tiffOffset, 8)) return null;

  const byteOrder = ascii(bytes, tiffOffset, 2);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;

  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const absoluteOffset = (relativeOffset: number, size: number) => {
    if (!Number.isInteger(relativeOffset) || relativeOffset < 0) return null;
    if (relativeOffset > bytes.length - tiffOffset) return null;

    const absolute = tiffOffset + relativeOffset;
    return isRangeValid(bytes.length, absolute, size) ? absolute : null;
  };

  const readUint16 = (relativeOffset: number) => {
    const absolute = absoluteOffset(relativeOffset, 2);
    return absolute === null ? null : view.getUint16(absolute, littleEndian);
  };

  const readUint32 = (relativeOffset: number) => {
    const absolute = absoluteOffset(relativeOffset, 4);
    return absolute === null ? null : view.getUint32(absolute, littleEndian);
  };

  if (readUint16(2) !== 42) return null;

  const readIfd = (relativeOffset: number) => {
    const entryCount = readUint16(relativeOffset);
    if (entryCount === null || entryCount > MAX_IFD_ENTRIES) return null;

    const entriesByteLength = entryCount * 12;
    if (absoluteOffset(relativeOffset + 2, entriesByteLength) === null) return null;

    const fields = new Map<number, TiffField>();
    for (let index = 0; index < entryCount; index += 1) {
      const entryOffset = relativeOffset + 2 + index * 12;
      const tag = readUint16(entryOffset);
      const type = readUint16(entryOffset + 2);
      const count = readUint32(entryOffset + 4);
      if (tag === null || type === null || count === null) return null;

      const typeSize = TIFF_TYPE_SIZES[type];
      if (!typeSize || count > Math.floor(Number.MAX_SAFE_INTEGER / typeSize)) continue;

      const byteLength = count * typeSize;
      const storedOffset = byteLength <= 4 ? entryOffset + 8 : readUint32(entryOffset + 8);
      if (storedOffset === null || absoluteOffset(storedOffset, byteLength) === null) continue;

      fields.set(tag, { type, count, valueOffset: storedOffset, byteLength });
    }

    return fields;
  };

  const ifd0Offset = readUint32(4);
  if (ifd0Offset === null) return null;

  const ifd0 = readIfd(ifd0Offset);
  const gpsPointer = ifd0?.get(0x8825);
  if (!gpsPointer || gpsPointer.type !== 4 || gpsPointer.count < 1) return null;

  const gpsIfdOffset = readUint32(gpsPointer.valueOffset);
  if (gpsIfdOffset === null) return null;

  const gpsIfd = readIfd(gpsIfdOffset);
  if (!gpsIfd) return null;

  const readReference = (tag: number) => {
    const field = gpsIfd.get(tag);
    if (!field || field.type !== 2 || field.count < 1) return null;

    const absolute = absoluteOffset(field.valueOffset, Math.min(field.byteLength, 4));
    if (absolute === null) return null;
    const reference = ascii(bytes, absolute, Math.min(field.byteLength, 4)).replace(/\0/g, "").trim().toUpperCase();
    return reference.charAt(0) || null;
  };

  const readDms = (tag: number, maxDegrees: number) => {
    const field = gpsIfd.get(tag);
    if (!field || field.type !== 5 || field.count < 3 || field.byteLength < 24) return null;

    const values: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      const componentOffset = field.valueOffset + index * 8;
      const numerator = readUint32(componentOffset);
      const denominator = readUint32(componentOffset + 4);
      if (numerator === null || denominator === null || denominator === 0) return null;
      values.push(numerator / denominator);
    }

    const [degrees, minutes, seconds] = values;
    if (
      !values.every(Number.isFinite) ||
      degrees < 0 ||
      degrees > maxDegrees ||
      minutes < 0 ||
      minutes >= 60 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      return null;
    }

    const decimal = degrees + minutes / 60 + seconds / 3_600;
    return decimal <= maxDegrees ? decimal : null;
  };

  const unsignedLat = readDms(0x0002, 90);
  const unsignedLon = readDms(0x0004, 180);
  if (unsignedLat === null || unsignedLon === null) return null;

  const latRef = readReference(0x0001);
  const lonRef = readReference(0x0003);
  if ((latRef && latRef !== "N" && latRef !== "S") || (lonRef && lonRef !== "E" && lonRef !== "W")) {
    return null;
  }

  const lat = latRef === "S" ? -unsignedLat : unsignedLat;
  const lon = lonRef === "W" ? -unsignedLon : unsignedLon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }

  return { lat: Object.is(lat, -0) ? 0 : lat, lon: Object.is(lon, -0) ? 0 : lon };
}

function parseJpegGps(bytes: Uint8Array) {
  if (!bytesEqual(bytes, 0, [0xff, 0xd8])) return null;

  let offset = 2;
  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (!isRangeValid(bytes.length, offset, 2)) return null;

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || !isRangeValid(bytes.length, offset, segmentLength)) return null;

    const payloadOffset = offset + 2;
    if (marker === 0xe1 && ascii(bytes, payloadOffset, 6) === "Exif\0\0") {
      const exifBytes = bytes.subarray(payloadOffset + 6, offset + segmentLength);
      const coordinates = parseTiffGps(exifBytes, 0);
      if (coordinates) return coordinates;
    }

    offset += segmentLength;
  }

  return null;
}

function parsePngGps(bytes: Uint8Array) {
  if (!bytesEqual(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return null;

  let offset = 8;
  while (isRangeValid(bytes.length, offset, 12)) {
    const chunkLength = readUint32BigEndian(bytes, offset);
    if (chunkLength === null) return null;

    const type = ascii(bytes, offset + 4, 4);
    const dataOffset = offset + 8;
    if (!isRangeValid(bytes.length, dataOffset, chunkLength) || !isRangeValid(bytes.length, dataOffset + chunkLength, 4)) {
      return null;
    }

    if (type === "eXIf") {
      const exifBytes = bytes.subarray(dataOffset, dataOffset + chunkLength);
      const coordinates = parseTiffGps(exifBytes, getTiffStart(exifBytes, 0));
      if (coordinates) return coordinates;
    }
    if (type === "IEND") break;

    offset = dataOffset + chunkLength + 4;
  }

  return null;
}

function parseWebpGps(bytes: Uint8Array) {
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;

  let offset = 12;
  while (isRangeValid(bytes.length, offset, 8)) {
    const type = ascii(bytes, offset, 4);
    const chunkLength = readUint32LittleEndian(bytes, offset + 4);
    if (chunkLength === null) return null;

    const dataOffset = offset + 8;
    const paddedLength = chunkLength + (chunkLength % 2);
    if (!isRangeValid(bytes.length, dataOffset, paddedLength)) return null;

    if (type === "EXIF") {
      const exifBytes = bytes.subarray(dataOffset, dataOffset + chunkLength);
      const coordinates = parseTiffGps(exifBytes, getTiffStart(exifBytes, 0));
      if (coordinates) return coordinates;
    }

    offset = dataOffset + paddedLength;
  }

  return null;
}

/**
 * Extracts EXIF GPS coordinates from JPEG/TIFF images and from PNG eXIf or
 * WebP EXIF chunks. Malformed or unsupported metadata is treated as absent.
 */
export async function extractGPSFromPhoto(file: File): Promise<GeoPhotoResult> {
  if (!file || file.size <= 0) return emptyResult();

  try {
    const bytesToRead = Math.min(file.size, MAX_METADATA_BYTES);
    const bytes = new Uint8Array(await file.slice(0, bytesToRead).arrayBuffer());

    let coordinates: Coordinates | null = null;
    if (bytesEqual(bytes, 0, [0xff, 0xd8])) {
      coordinates = parseJpegGps(bytes);
    } else if (ascii(bytes, 0, 2) === "II" || ascii(bytes, 0, 2) === "MM") {
      coordinates = parseTiffGps(bytes, 0);
    } else if (bytesEqual(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      coordinates = parsePngGps(bytes);
    } else if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
      coordinates = parseWebpGps(bytes);
    }

    return coordinates
      ? { ...coordinates, hasGeoData: true }
      : emptyResult();
  } catch {
    return emptyResult();
  }
}
