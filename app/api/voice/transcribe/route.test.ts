import assert from "node:assert/strict";
import test from "node:test";
import {
  createLocalWhisperTranscriber,
  createVoiceTranscriptionPostHandler,
  isSupportedVoiceAudio,
  type VoiceTranscriptionDependencies,
} from "./route";

const audio = new File([new Uint8Array([1, 2, 3])], "command.webm", {
  type: "audio/webm",
});

function request(file: Blob = audio) {
  const form = new FormData();
  form.set("audio", file, file instanceof File ? file.name : "command.webm");
  return new Request("http://localhost/api/voice/transcribe", {
    method: "POST",
    body: form,
  });
}

function requestWithForm(form: FormData) {
  return new Request("http://localhost/api/voice/transcribe", {
    method: "POST",
    body: form,
  });
}

function dependencies(
  overrides: Partial<VoiceTranscriptionDependencies> = {},
): VoiceTranscriptionDependencies {
  return {
    isFeatureEnabled: () => true,
    getSessionUser: async () => ({ id: "admin-1", role: "admin" }),
    transcribe: async () => "Show delayed projects",
    ...overrides,
  };
}

test("fails closed while disabled before auth or local Whisper", async () => {
  let authenticated = 0;
  let transcribed = 0;
  const handler = createVoiceTranscriptionPostHandler(
    dependencies({
      isFeatureEnabled: () => false,
      getSessionUser: async () => {
        authenticated += 1;
        return null;
      },
      transcribe: async () => {
        transcribed += 1;
        return "unexpected";
      },
    }),
  );

  const response = await handler(request());
  assert.equal(response.status, 404);
  assert.equal(authenticated, 0);
  assert.equal(transcribed, 0);
});

test("requires an authenticated administrator", async () => {
  for (const user of [
    null,
    { id: "citizen-1", role: "citizen" },
    { id: "moderator-1", role: "moderator" },
  ]) {
    let transcribed = 0;
    const response = await createVoiceTranscriptionPostHandler(
      dependencies({
        getSessionUser: async () => user,
        transcribe: async () => {
          transcribed += 1;
          return "unexpected";
        },
      }),
    )(request());

    assert.equal(response.status, user ? 403 : 401);
    assert.equal(transcribed, 0);
  }
});

test("rejects unsupported and oversized audio before local Whisper", async () => {
  let transcribed = 0;
  const handler = createVoiceTranscriptionPostHandler(
    dependencies({
      transcribe: async () => {
        transcribed += 1;
        return "unexpected";
      },
    }),
  );

  const invalid = await handler(
    request(new File(["text"], "command.txt", { type: "text/plain" })),
  );
  const oversized = await handler(
    request(
      new File([new Uint8Array(25 * 1024 * 1024 + 1)], "large.webm", {
        type: "audio/webm",
      }),
    ),
  );

  assert.equal(invalid.status, 400);
  assert.equal(oversized.status, 413);
  assert.equal(transcribed, 0);
});

test("rejects an oversized transport before parsing multipart data", async () => {
  let parsed = false;
  const oversizedTransport = request();
  Object.defineProperty(oversizedTransport, "formData", {
    value: async () => {
      parsed = true;
      return new FormData();
    },
  });
  oversizedTransport.headers.set("content-length", String(25 * 1024 * 1024 + 65_537));

  const response = await createVoiceTranscriptionPostHandler(dependencies())(oversizedTransport);
  assert.equal(response.status, 413);
  assert.equal(parsed, false);
});

test("rejects an oversized chunked transport without Content-Length", async () => {
  const oversized = new Uint8Array(25 * 1024 * 1024 + 65_537);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(oversized);
      controller.close();
    },
  });
  const chunkedRequest = new Request("http://localhost/api/voice/transcribe", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=voice-boundary" },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const response = await createVoiceTranscriptionPostHandler(dependencies())(chunkedRequest);
  assert.equal(response.status, 413);
});

test("rejects unexpected or duplicate multipart fields", async () => {
  const handler = createVoiceTranscriptionPostHandler(dependencies());
  const unexpected = new FormData();
  unexpected.append("audio", audio, "command.webm");
  unexpected.append("notes", "unexpected");
  assert.equal((await handler(requestWithForm(unexpected))).status, 400);

  const duplicate = new FormData();
  duplicate.append("audio", audio, "one.webm");
  duplicate.append("audio", audio, "two.webm");
  assert.equal((await handler(requestWithForm(duplicate))).status, 400);
});

test("accepts safe browser audio metadata fallbacks without accepting arbitrary files", () => {
  assert.equal(
    isSupportedVoiceAudio(
      new File([new Uint8Array([1])], "command.webm", {
        type: "application/octet-stream",
      }),
    ),
    true,
  );
  assert.equal(
    isSupportedVoiceAudio(
      new File([new Uint8Array([1])], "command.webm", {
        type: "video/webm",
      }),
    ),
    true,
  );
  assert.equal(
    isSupportedVoiceAudio(
      new File([new Uint8Array([1])], "command.exe", {
        type: "video/webm",
      }),
    ),
    false,
  );
  assert.equal(
    isSupportedVoiceAudio(
      new File([new Uint8Array([1])], "command.exe", {
        type: "application/octet-stream",
      }),
    ),
    false,
  );
});

test("forwards audio to local Whisper with server-only authentication", async () => {
  let receivedUrl = "";
  let receivedAuthorization = "";
  let receivedAudio: FormDataEntryValue | null = null;

  const transcribe = createLocalWhisperTranscriber({
    endpoint: "http://127.0.0.1:8002/transcribe",
    token: "local-test-token-at-least-24-characters",
    fetchImpl: async (input, init) => {
      receivedUrl = String(input);
      const headers = new Headers(init?.headers);
      receivedAuthorization = headers.get("authorization") ?? "";
      const form = init?.body as FormData;
      receivedAudio = form.get("audio");
      return Response.json({ text: "  Show delayed projects  " });
    },
  });

  const text = await transcribe(audio, new AbortController().signal);

  assert.equal(text, "  Show delayed projects  ");
  assert.equal(receivedUrl, "http://127.0.0.1:8002/transcribe");
  assert.equal(receivedAuthorization, "Bearer local-test-token-at-least-24-characters");
  assert.ok((receivedAudio as unknown) instanceof File);
});

test("rejects non-loopback local Whisper endpoints", () => {
  assert.throws(
    () =>
      createLocalWhisperTranscriber({
        endpoint: "https://example.com/transcribe",
        token: "local-test-token-at-least-24-characters",
      }),
    /loopback/,
  );
});

test("returns trimmed transcription without storing audio", async () => {
  let received: File | undefined;
  const response = await createVoiceTranscriptionPostHandler(
    dependencies({
      transcribe: async (file) => {
        received = file;
        return "  Show delayed projects  ";
      },
    }),
  )(request());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: "Show delayed projects" });
  assert.equal(received?.type, "audio/webm");
  assert.equal(received?.name, "command.webm");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
