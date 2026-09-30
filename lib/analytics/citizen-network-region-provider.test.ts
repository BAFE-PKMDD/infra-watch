import assert from "node:assert/strict";
import { test } from "bun:test";

import { chooseCanonicalNetworkRegion } from "./citizen-network-region-provider";

const rows = [
  { provinceName: "CEBU", regionName: "REGION VII (CENTRAL VISAYAS)", code: "PH070000000" },
  { provinceName: "NCR, SECOND DISTRICT (CITY OF SAN JUAN)", regionName: "NATIONAL CAPITAL REGION (NCR)", code: "PH130000000" },
  { provinceName: "DAVAO DEL SUR", regionName: "REGION XI (DAVAO REGION)", code: "PH110000000" },
  { provinceName: "DAVAO DEL NORTE", regionName: "REGION XI (DAVAO REGION)", code: "PH110000000" },
];

test("maps exact GeoIP subdivisions to canonical PSGC regions", () => {
  assert.deepEqual(chooseCanonicalNetworkRegion("Cebu", rows), {
    code: "PH070000000",
    label: "REGION VII (CENTRAL VISAYAS)",
  });
});

test("maps the explicit Metro Manila alias to NCR", () => {
  assert.deepEqual(chooseCanonicalNetworkRegion("Metro Manila", rows), {
    code: "PH130000000",
    label: "NATIONAL CAPITAL REGION (NCR)",
  });
});

test("fails closed for broad or unmatched subdivision names", () => {
  assert.equal(chooseCanonicalNetworkRegion("Davao", rows), null);
  assert.equal(chooseCanonicalNetworkRegion("Unknown Province", rows), null);
});
