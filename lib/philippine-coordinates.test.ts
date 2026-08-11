import assert from "node:assert/strict";
import test from "node:test";

import { isPhilippineCoordinatePair } from "./philippine-coordinates";

test("accepts real Philippine coordinate pairs and rejects missing, generated-default, and out-of-range values", () => {
  assert.equal(isPhilippineCoordinatePair(14.5995, 120.9842), true);
  assert.equal(isPhilippineCoordinatePair(6.9214, 122.079), true);
  assert.equal(isPhilippineCoordinatePair(null, 121.774), false);
  assert.equal(isPhilippineCoordinatePair(12.8797, null), false);
  assert.equal(isPhilippineCoordinatePair(0, 0), false);
  assert.equal(isPhilippineCoordinatePair(1000, 1000), false);
  assert.equal(isPhilippineCoordinatePair(12, 110), false);
});
