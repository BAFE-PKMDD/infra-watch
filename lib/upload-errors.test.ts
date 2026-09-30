import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE,
  MALICIOUS_FILE_UPLOAD_MESSAGE,
  STORAGE_UNAVAILABLE_UPLOAD_MESSAGE,
  UPLOAD_ERROR_TITLES,
  getClientUploadErrorMessage,
  getKnownUploadMessageCode,
  getUploadErrorText,
  getUploadErrorTitle,
  isUploadStorageUnavailable,
} from "./upload-errors";
import { site } from "@/i18n/sections/site";
import { translate } from "@/i18n/translate";

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

test("upload error titles keep their English text and have a code for translation", () => {
  assert.equal(getUploadErrorTitle(STORAGE_UNAVAILABLE_UPLOAD_MESSAGE), "Storage temporarily unavailable");
  assert.equal(getUploadErrorTitle(INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE), "Inappropriate image blocked");
  assert.equal(getUploadErrorTitle(MALICIOUS_FILE_UPLOAD_MESSAGE), "Invalid file blocked");
  assert.equal(getUploadErrorTitle("File size exceeds 5MB"), "Upload blocked");
  assert.deepEqual(UPLOAD_ERROR_TITLES, site.en.uploadErrors.title);
  assert.deepEqual(site.en.uploadErrors.message, {
    storage: STORAGE_UNAVAILABLE_UPLOAD_MESSAGE,
    inappropriate: INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE,
    invalidFile: MALICIOUS_FILE_UPLOAD_MESSAGE,
  });
  assert.equal(getKnownUploadMessageCode(MALICIOUS_FILE_UPLOAD_MESSAGE), "invalidFile");
  assert.equal(getKnownUploadMessageCode("constructor"), null);
});

test("upload error text follows the visitor's language and shows other server details as sent", () => {
  const en = (path: string) => translate("en", path);
  const tl = (path: string) => translate("tl", path);

  assert.deepEqual(getUploadErrorText(STORAGE_UNAVAILABLE_UPLOAD_MESSAGE, en), {
    title: "Storage temporarily unavailable",
    description: STORAGE_UNAVAILABLE_UPLOAD_MESSAGE,
  });
  assert.deepEqual(getUploadErrorText(INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE, tl), {
    title: site.tl.uploadErrors.title.inappropriate,
    description: site.tl.uploadErrors.message.inappropriate,
  });
  assert.deepEqual(getUploadErrorText("File size exceeds 100MB", tl), {
    title: site.tl.uploadErrors.title.blocked,
    description: "File size exceeds 100MB",
  });
});
