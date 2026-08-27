# ANIA voice assistant

ANIA (Agricultural Network Intelligence Assistant) is an administrator-only voice extension of the existing InfraWatch text copilot.

## Architecture

```text
Admin browser (admin route group only)
  ├─ microphone PCM ──WSS + 60-second admin token──> openWakeWord CPU sidecar
  │                                                    │
  │<────────────────── wake_detected ──────────────────┘
  ├─ MediaRecorder + local silence detection
  ├─ audio WebM/MP4 ──POST /api/voice/transcribe──> admin auth + size/type checks
  │                                                   └─ Local faster-whisper sidecar (CPU, INT8)
   ├─ transcript ──POST /api/chat──> existing policy, limits, tools, history, LLM stream
   └─ completed answer ──summarized for voice──> kokoro-js q8/WASM inside a dedicated
      Web Worker (public/ania/tts-worker.js) ──> WAV blob playback on the main thread
```

The sidecar performs only wake detection. Recorded commands are not stored by the voice routes. The existing chat route remains the source of truth for AI policy, function calls, rate limits, and history.

## Why this architecture

- openWakeWord has no official complete JavaScript/browser port. Its own documentation recommends browser audio streamed to a Python WebSocket service. CPU inference is lightweight and does not need a GPU.
- kokoro-js runs Kokoro locally in the browser with q4 WASM for a smaller first download and faster inference. Synthesis executes inside a dedicated Web Worker (`lib/voice/tts-worker.ts`) so ONNX inference never blocks the UI thread; if workers or module workers are unavailable, synthesis transparently falls back to the main thread. This avoids a second inference service and keeps generated speech local; first-use download and synthesis latency still vary by device and browser cache.
- The app ships `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` headers (next.config.ts), which enables cross-origin isolation so onnxruntime-web uses multithreaded WASM inside the worker. Verify social sign-in popups and third-party embeds after enabling; `credentialless` keeps cross-origin images working in Chromium browsers.
- ANIA now speaks while the LLM is still writing: the chat stream forwards raw deltas to `createStreamingSpeechRunner` (lib/voice/runtime-policy.ts), which buffers them into complete sentences, synthesizes each inside the worker (serialized, one at a time), and plays them in order — the next sentence is synthesized while the current one plays. A ~400-character spoken budget applies incrementally; once exhausted, remaining sentences are skipped and the summary notice is appended after the stream ends. The retry prompt still uses the one-shot `speak` path.
- Long answers are summarized before speaking: the streaming spoken budget (and `summarizeForSpeech` on the one-shot path) keeps whole sentences up to ~400 characters (hard-truncating a single overlong sentence at a word boundary) and appends a notice pointing to the full answer in the chat panel. The chat transcript always retains the complete answer.
- Browsers require a user permission/activation before persistent microphone use. The first mic toggle is therefore intentional; the stored preference may reconnect on later visits where the browser permits it.

## Install

The application dependency is:

```cmd
npm install kokoro-js
```

The speech worker is a prebuilt ESM bundle at `public/ania/tts-worker.js` compiled from `lib/voice/tts-worker.ts` via esbuild. It is regenerated automatically:

```cmd
npm run build:tts-worker   # one-off rebuild (invoked by `npm run dev` and `npm run build`)
```

This sidesteps the Next.js 16.2.x production regression where `new Worker(new URL(..., import.meta.url))` is emitted as a raw `.ts` asset instead of a compiled worker. The hook loads `/ania/tts-worker.js` as a module worker and falls back to main-thread synthesis if module workers are unavailable.

The sidecar dependencies are:

```cmd
cd services\ania-wake-word && python -m venv .venv && .venv\Scripts\python -m pip install -r requirements.txt
```

## Custom ANIA wake and sleep models

1. Use the official openWakeWord training Colab linked from https://github.com/dscripka/openWakeWord.
2. Train positive examples for `Hey ANIA` and `ANIA sleep`, including expected Filipino and English accents and background office noise.
3. Store the self-contained wake model at `services/ania-wake-word/models/hey_ania.onnx`.
4. Store the sleep classifier at `services/ania-wake-word/models/anh_ya_sleep.onnx` and its required external weights at `services/ania-wake-word/models/anh_ya_sleep.onnx.data`.
5. Evaluate false accepts and false rejects with local recordings before enabling production.

A stock model cannot be renamed to create a new phrase. The service fails closed when either sleep-model file is missing.

## Run locally

Set the same `WAKE_WORD_TOKEN_SECRET` (at least 24 random characters) in the Next.js environment and the sidecar environment, then:

```cmd
cd services\ania-wake-word && set WAKE_WORD_TOKEN_SECRET=replace-with-a-long-random-secret&& .venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```cmd
set VOICE_ASSISTANT_ENABLED=true&& set WAKE_WORD_WS_URL=ws://localhost:8000/wake&& npm run dev
```

Production must reverse-proxy `/voice/wake` to the sidecar with WebSocket upgrade headers over TLS. Do not publish the sidecar port directly. The browser obtains a signed, administrator-only, 60-second connection token from `/api/voice/wake-token` and sends it as a WebSocket subprotocol value so it is not exposed in URL/access logs.

## Verification

1. Disabled flag: `/api/voice/transcribe` and `/api/voice/wake-token` return 404 before downstream work; no ANIA control renders.
2. Authorization: citizen and moderator sessions receive 403 from both voice routes; only role `admin` is accepted.
3. Sidecar: `GET /healthz` returns `{ "ready": true }` after the custom model loads.
4. Browser: sign in as an exact admin and open an admin page. ANIA attempts to enable automatically; grant microphone permission when the browser requires the first user-approved prompt. Say “Hey ANIA” and verify recording, transcribing, thinking, preparing voice, audible speaking, and the one-turn follow-up listening window.
5. Silence: after wake, say nothing for five seconds; verify ANIA asks once, listens for another five seconds, then returns to passive wake listening without uploading silent audio. After an answer, the quiet follow-up window returns directly to passive wake listening when unused.
6. Sleep: say “ANIA sleep” and verify the panel closes while passive wake listening remains enabled; say “Hey ANIA” to reopen it.
7. Typed fallback: disable voice with Ctrl+Shift+V and verify typed chat remains functional.
8. Security: inspect Network—no API key is sent to the browser, wake audio uses WSS in production, and transcription responses use `Cache-Control: no-store`.
9. Browser matrix: test current Chrome and Edge, denied microphone permission, autoplay restrictions, and an unavailable sidecar for user-friendly errors.

## Operational notes

- The worker bundle (`public/ania/tts-worker.js`, 2.1 MB minified) is committed so the running dev server can serve it immediately; `npm run dev`/`npm run build` regenerate it first. Rebuild after editing `lib/voice/tts-worker.ts`. Standalone deployments must copy the `public/` directory alongside `.next/standalone` (standard Next.js standalone requirement).
- Kokoro is pre-warmed after voice mode starts (the hook now warms the worker engine rather than the main thread). The first browser load can still download model assets; later responses use the browser cache.
- Voice requests use a concise, speech-oriented response mode to reduce both provider generation and Kokoro synthesis time. Typed requests retain full Markdown, tables, and charts.
- Current Kokoro voices are strongest in supported English accents. Validate Filipino names and mixed Filipino/English responses before relying on spoken output.
- On exact-admin pages ANIA attempts automatic voice startup, subject to browser microphone permission and autoplay rules. Browser and OS privacy indicators remain visible.
