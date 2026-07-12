const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS psgc_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        geo_code text NOT NULL UNIQUE,
        geo_code1 text,
        region_name text NOT NULL,
        reg_shortname text,
        province_name text,
        municipality_name text,
        barangay_name text,
        region_code text,
        province_code text,
        municipality_code text,
        barangay_code text,
        phcode_reg text,
        phcode_prov text,
        phcode_mun text,
        phcode_bgy text,
        reg_code1 text,
        prov_code1 text,
        mun_code1 text,
        bgy_code1 text,
        dist_code text,
        district text,
        city_class text,
        latitude real,
        longitude real,
        last_synced_at timestamp NOT NULL DEFAULT now(),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `;
    console.log("Successfully created psgc_locations table");
  } catch(err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
