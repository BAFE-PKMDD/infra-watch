import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";

import { SMS_MOCK_SCENARIOS } from "./mock-fixtures";
import {
  fetchLiveSmsGrievanceRecords,
  formatLiveLocationLabel,
  getSmsGrievanceQueue,
  mapRawGrievanceToRecord,
  parsePhReceivedAt,
  type RawSmsGrievanceMessage,
} from "./live-source";

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

const RAW_MESSAGE: RawSmsGrievanceMessage = {
  id: 20,
  sms_id: "+639510411475",
  sms_number: "+639510411475",
  sms_content: "testing from kidapawan north cotabato",
  sms_receive_date: "11/05/2025",
  sms_receive_time: "11:37:28 PM",
  location: "6.99607,125.0715867",
  status: 1,
  month: "November",
  year: 2025,
};

test("parsePhReceivedAt converts Asia/Manila local time to UTC", () => {
  assert.equal(parsePhReceivedAt("11/05/2025", "11:37:28 PM"), "2025-11-05T15:37:28.000Z");
  assert.equal(parsePhReceivedAt("01/14/2026", "08:48:14 AM"), "2026-01-14T00:48:14.000Z");
});

test("parsePhReceivedAt rejects unparseable date or time strings", () => {
  assert.equal(parsePhReceivedAt("not-a-date", "11:37:28 PM"), null);
  assert.equal(parsePhReceivedAt("11/05/2025", "not-a-time"), null);
});

test("formatLiveLocationLabel renders bare coordinates without inventing a place name", () => {
  assert.equal(formatLiveLocationLabel("6.99607,125.0715867"), "Coordinates 6.99607, 125.0715867 (no place name provided)");
  assert.equal(formatLiveLocationLabel(""), "Location not provided");
  assert.equal(formatLiveLocationLabel(undefined), "Location not provided");
});

test("mapRawGrievanceToRecord produces an untriaged record staff must review", () => {
  const record = mapRawGrievanceToRecord(RAW_MESSAGE);

  assert.equal(record.id, "live-sms-20");
  assert.equal(record.scenario, "live_import");
  assert.equal(record.prototype, true);
  assert.equal(record.contactNumber, "+639510411475");
  assert.equal(record.originalText, RAW_MESSAGE.sms_content);
  assert.equal(record.status, "needs_relevance_review");
  assert.equal(record.relevance, "uncertain");
  assert.equal(record.category, null);
  assert.equal(record.projectMatch, "not_identified");
  assert.equal(record.language, "Unknown");
  assert.equal(record.conversation.length, 1);
  assert.equal(record.conversation[0].body, RAW_MESSAGE.sms_content);
});

test("mapRawGrievanceToRecord treats the literal string \"null\" as no sender number", () => {
  const record = mapRawGrievanceToRecord({ ...RAW_MESSAGE, sms_number: "null", sms_id: "null" });
  assert.equal(record.contactNumber, "Not provided");
});

test("fetchLiveSmsGrievanceRecords maps every well-formed message from the live feed", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ messages: [RAW_MESSAGE, { ...RAW_MESSAGE, id: 21, sms_number: "null" }] }));
  });
  const origin = await listen(server);
  const previous = process.env.SMS_GRIEVANCE_API_URL;
  process.env.SMS_GRIEVANCE_API_URL = origin;

  try {
    const records = await fetchLiveSmsGrievanceRecords();
    assert.equal(records.length, 2);
    assert.deepEqual(records.map((item) => item.id), ["live-sms-20", "live-sms-21"]);
  } finally {
    process.env.SMS_GRIEVANCE_API_URL = previous;
    await close(server);
  }
});

test("getSmsGrievanceQueue falls back to sample messages when the live feed is unreachable", async () => {
  const previous = process.env.SMS_GRIEVANCE_API_URL;
  // Nothing is listening on this port.
  process.env.SMS_GRIEVANCE_API_URL = "http://127.0.0.1:1";

  try {
    const queue = await getSmsGrievanceQueue();
    assert.equal(queue.dataSource, "sample");
    assert.equal(queue.liveFetchError, true);
    assert.deepEqual(queue.records, SMS_MOCK_SCENARIOS);
  } finally {
    process.env.SMS_GRIEVANCE_API_URL = previous;
  }
});

test("getSmsGrievanceQueue falls back to sample messages on a malformed response body", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ notMessages: [] }));
  });
  const origin = await listen(server);
  const previous = process.env.SMS_GRIEVANCE_API_URL;
  process.env.SMS_GRIEVANCE_API_URL = origin;

  try {
    const queue = await getSmsGrievanceQueue();
    assert.equal(queue.dataSource, "sample");
    assert.equal(queue.liveFetchError, true);
  } finally {
    process.env.SMS_GRIEVANCE_API_URL = previous;
    await close(server);
  }
});

test("getSmsGrievanceQueue reports live data on success", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ messages: [RAW_MESSAGE] }));
  });
  const origin = await listen(server);
  const previous = process.env.SMS_GRIEVANCE_API_URL;
  process.env.SMS_GRIEVANCE_API_URL = origin;

  try {
    const queue = await getSmsGrievanceQueue();
    assert.equal(queue.dataSource, "live");
    assert.equal(queue.liveFetchError, false);
    assert.equal(queue.records.length, 1);
  } finally {
    process.env.SMS_GRIEVANCE_API_URL = previous;
    await close(server);
  }
});
