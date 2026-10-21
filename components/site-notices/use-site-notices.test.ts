import assert from "node:assert/strict";
import { spyOn, test } from "bun:test";
import {
  environmentManager,
  QueryClient,
  QueryObserver,
  timeoutManager,
} from "@tanstack/react-query";

import { DEFAULT_BANNER_SETTINGS } from "@/types/banner.types";
import { siteNoticesQueryOptions } from "./use-site-notices";

test("polling applies maintenance and banner changes without navigation or window focus", async () => {
  const browser = spyOn(environmentManager, "isServer").mockReturnValue(false);
  const timer: { tick?: () => void; delay?: number } = {};
  const interval = spyOn(timeoutManager, "setInterval").mockImplementation(
    (callback, delay) => {
      timer.tick = () => callback();
      timer.delay = delay;
      return 0;
    },
  );
  const clearInterval = spyOn(
    timeoutManager,
    "clearInterval",
  ).mockImplementation(() => {});
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const banner = {
    ...DEFAULT_BANNER_SETTINGS,
    isEnabled: true,
    message: "Updated service notice",
  };
  globalThis.fetch = (async (url) => {
    assert.equal(url, "/api/public/site-notices");
    calls++;
    return Response.json(
      calls === 1
        ? { maintenance: false, banner: null }
        : { maintenance: true, banner },
    );
  }) as typeof fetch;
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  const observer = new QueryObserver(client, siteNoticesQueryOptions);
  const unsubscribe = observer.subscribe(() => {});
  let stopWatching = () => {};
  try {
    await observer.refetch();
    assert.equal(observer.getCurrentResult().data?.maintenance, false);
    assert.equal(timer.delay, 60_000);
    assert.ok(timer.tick, "an active page must schedule a refresh");
    const refreshed = new Promise<void>((resolve) => {
      stopWatching = observer.subscribe((result) => {
        if (result.data?.maintenance === true) resolve();
      });
    });
    timer.tick();
    await refreshed;
    assert.equal(calls, 2);
    assert.equal(observer.getCurrentResult().data?.maintenance, true);
    assert.deepEqual(observer.getCurrentResult().data?.banner, banner);
  } finally {
    stopWatching();
    unsubscribe();
    client.clear();
    globalThis.fetch = originalFetch;
    interval.mockRestore();
    clearInterval.mockRestore();
    browser.mockRestore();
  }
});
