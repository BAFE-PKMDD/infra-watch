import assert from "node:assert/strict";
import test from "node:test";

import { uploadLiveVideoAsset } from "./live-video-upload";

test("uploads a live-video asset through the existing authenticated upload route", async () => {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "thumbnail.jpg", {
    type: "image/jpeg",
  });
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;

  const path = await uploadLiveVideoAsset(file, async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;
    return Response.json({ success: true, path: "live-videos/example.jpg" });
  });

  assert.equal(requestedUrl, "/api/upload?folder=live-videos");
  assert.equal(requestedInit?.method, "POST");
  assert.equal(requestedInit?.credentials, "include");
  assert.ok(requestedInit?.body instanceof FormData);
  const uploaded = (requestedInit.body as FormData).get("file");
  assert.ok(uploaded instanceof File);
  assert.equal(uploaded.name, file.name);
  assert.equal(uploaded.type, file.type);
  assert.equal(uploaded.size, file.size);
  assert.equal(path, "live-videos/example.jpg");
});

test("surfaces the upload endpoint error", async () => {
  const file = new File(["video"], "clip.mp4", { type: "video/mp4" });

  await assert.rejects(
    uploadLiveVideoAsset(file, async () => Response.json(
      { error: "Video size exceeds 100MB limit." },
      { status: 400 },
    )),
    /Video size exceeds 100MB limit/,
  );
});
