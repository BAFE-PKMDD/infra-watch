import { or, sql, type SQL } from "drizzle-orm";
import { projects } from "@/lib/db/schema";

const PSGC_CODE_LENGTH = 9;

/**
 * ABEMIS occasionally delivers PSGC codes with surrounding whitespace or with the
 * leading zero of a Region I-IX code dropped ("64502011" for "064502011"). Location
 * filters match by code prefix, so those rows would silently fall out of every
 * region/province/city/barangay filter. Normalize to the canonical 9-digit form.
 */
export function normalizePsgcCode(value: string | null | undefined): string | null {
  const digits = value?.replace(/\s+/g, "") ?? "";
  if (!/^\d+$/.test(digits)) return null;
  return digits.length < PSGC_CODE_LENGTH ? digits.padStart(PSGC_CODE_LENGTH, "0") : digits;
}

const normalizedProjectPsgcCode = sql`lpad(regexp_replace(${projects.psgcCode}, '\\s', '', 'g'), ${PSGC_CODE_LENGTH}, '0')`;

/** Matches projects whose normalized PSGC code starts with `prefix` (digits only). */
export function projectPsgcPrefixCondition(prefix: string): SQL {
  const safePrefix = prefix.replace(/\D/g, "");
  return sql`${normalizedProjectPsgcCode} LIKE ${`${safePrefix}%`}`;
}

/** Matches projects whose PSGC code starts with any of the comma-separated prefixes. */
export function projectPsgcPrefixListCondition(prefixes: string): SQL {
  const conditions = prefixes.split(",").filter(Boolean).map(projectPsgcPrefixCondition);
  return or(...conditions)!;
}
