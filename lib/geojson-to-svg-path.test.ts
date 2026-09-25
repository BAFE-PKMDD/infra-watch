import assert from "node:assert/strict";
import test from "node:test";

import {
  createEquirectangularProjector,
  geometryToSvgPath,
  type GeoFeatureCollection,
} from "./geojson-to-svg-path";

const square: GeoFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]],
      },
    },
  ],
};

test("projects the full extent of the data into the padded viewport", () => {
  const project = createEquirectangularProjector(square, 100, 100, 10);
  const [x0, y0] = project([0, 0]); // bottom-left in lat/lon -> bottom-left in screen space
  const [x1, y1] = project([10, 10]); // top-right in lat/lon -> top-right in screen space (y flipped)

  assert.equal(x0, 10);
  assert.equal(y0, 90); // lat 0 is the southern edge, so it sits at the bottom of the viewport
  assert.equal(x1, 90);
  assert.equal(y1, 10); // lat 10 is the northern edge, so it sits at the top of the viewport
});

test("keeps a non-square extent centered within the viewport rather than stretching it", () => {
  const wide: GeoFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 10], [20, 10], [20, 0], [0, 0]]] },
      },
    ],
  };
  const project = createEquirectangularProjector(wide, 100, 100, 0);
  // 20-wide by 10-tall extent into a 100x100 box: scale is capped by the width (100/20=5),
  // so the projected height is only 50 and should be vertically centered (25px margin each side).
  const [, yTop] = project([0, 10]);
  const [, yBottom] = project([0, 0]);
  assert.equal(yTop, 25);
  assert.equal(yBottom, 75);
});

test("builds a closed SVG path with M/L/Z commands for a simple polygon", () => {
  const project = createEquirectangularProjector(square, 20, 20, 0);
  const path = geometryToSvgPath(square.features[0].geometry, project);
  assert.match(path, /^M0\.00,20\.00/);
  assert.match(path, /Z$/);
  // 5 points in the ring (the 5th repeats the 1st to close it): 1 M + 4 L.
  assert.equal((path.match(/L/g) ?? []).length, 4);
});

test("renders every ring of a MultiPolygon (e.g. an archipelago region with separate islands)", () => {
  const multi: GeoFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
            [[[5, 5], [5, 6], [6, 6], [6, 5], [5, 5]]],
          ],
        },
      },
    ],
  };
  const project = createEquirectangularProjector(multi, 100, 100, 0);
  const path = geometryToSvgPath(multi.features[0].geometry, project);
  assert.equal((path.match(/M/g) ?? []).length, 2, "expected one M (move-to) per island");
  assert.equal((path.match(/Z/g) ?? []).length, 2);
});
