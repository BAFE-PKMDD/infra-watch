const fs = require('fs');

const psgcSchemaCode = `
export const psgcLocations = pgTable("psgc_locations", {
  id: uuid("id").primaryKey().defaultRandom(),

  // PSGC Identifiers
  geoCode: text("geo_code").notNull().unique(), // The 10-digit code (geo_code)
  geoCode1: text("geo_code1"), // The 9-digit code (geo_code1)

  // Names
  regionName: text("region_name").notNull(),
  regionShortname: text("reg_shortname"),
  provinceName: text("province_name"),
  municipalityName: text("municipality_name"),
  barangayName: text("barangay_name"),

  // Specific Codes
  regionCode: text("region_code"),
  provinceCode: text("province_code"),
  municipalityCode: text("municipality_code"),
  barangayCode: text("barangay_code"),

  // phcodes
  phcodeReg: text("phcode_reg"),
  phcodeProv: text("phcode_prov"),
  phcodeMun: text("phcode_mun"),
  phcodeBgy: text("phcode_bgy"),

  // Additional Codes
  regCode1: text("reg_code1"),
  provCode1: text("prov_code1"),
  munCode1: text("mun_code1"),
  bgyCode1: text("bgy_code1"),

  // District/Misc
  distCode: text("dist_code"),
  district: text("district"),
  cityClass: text("city_class"),

  // Coordinates
  latitude: real("latitude"),
  longitude: real("longitude"),

  // Metadata
  lastSyncedAt: timestamp("last_synced_at", { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).notNull().defaultNow(),
});

export type PsgcLocation = typeof psgcLocations.$inferSelect;
export type NewPsgcLocation = typeof psgcLocations.$inferInsert;
`;

fs.appendFileSync('lib/db/schema.ts', psgcSchemaCode);
console.log('Successfully appended psgcLocations to schema.ts');
