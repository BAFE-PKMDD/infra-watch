import assert from "node:assert/strict";
import test from "node:test";

import {
  STORAGE_UNAVAILABLE_UPLOAD_MESSAGE,
  getClientUploadErrorMessage,
  isUploadStorageUnavailable,
} from "./upload-errors";

test("storage connection failures are presented as a temporary service outage", () => {
  for (const message of [
    "connect ECONNREFUSED 203.177.29.238:443",
    "Unable to connect. Is the computer able to access the url?",
    "getaddrinfo ENOTFOUND storage.example",
    "request timed out while connecting to object storage",
  ]) {
    assert.equal(isUploadStorageUnavailable(message), true);
    assert.equal(getClientUploadErrorMessage(message), STORAGE_UNAVAILABLE_UPLOAD_MESSAGE);
  }
});

test("validation failures are not classified as storage outages", () => {
  assert.equal(isUploadStorageUnavailable("Invalid file extension"), false);
});
