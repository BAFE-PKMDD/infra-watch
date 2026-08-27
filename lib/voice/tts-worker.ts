import type { KokoroTTS } from "kokoro-js";

export type TtsDtype = "fp32" | "fp16" | "q8" | "q4" | "q4f16";

export type TtsWorkerRequest =
  | { type: "load"; model: string; dtype: TtsDtype }
  | {
      type: "generate";
      requestId: number;
      model: string;
      dtype: TtsDtype;
      voice: string;
      text: string;
    };

export type TtsWorkerResponse =
  | { type: "ready" }
  | { type: "failure"; message: string }
  | { type: "audio"; requestId: number; blob: Blob }
  | { type: "generation-failed"; requestId: number; message: string };

let loadedModel: Promise<KokoroTTS> | null = null;
let activeConfigKey: string | null = null;
let generationQueue: Promise<unknown> = Promise.resolve();

function ensureLoaded(model: string, dtype: TtsDtype) {
  const configKey = `${model}::${dtype}`;
  if (!loadedModel || activeConfigKey !== configKey) {
    activeConfigKey = configKey;
    loadedModel = import("kokoro-js")
      .then(({ KokoroTTS }) =>
        KokoroTTS.from_pretrained(model, { dtype, device: "wasm" }),
      )
      .catch((error) => {
        loadedModel = null;
        activeConfigKey = null;
        throw error;
      });
  }
  return loadedModel;
}

function readableError(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "ANIA speech synthesis failed.";
}

const workerContext = self as unknown as {
  onmessage: ((event: MessageEvent<TtsWorkerRequest>) => void) | null;
  postMessage: (message: TtsWorkerResponse) => void;
};

workerContext.onmessage = async (event) => {
  const request = event.data;
  try {
    const tts = await ensureLoaded(request.model, request.dtype);
    if (request.type === "load") {
      workerContext.postMessage({ type: "ready" });
      return;
    }
    const generation = generationQueue.then(() =>
      tts.generate(request.text, {
        voice: request.voice as "af_heart",
      }),
    );
    generationQueue = generation.then(
      () => undefined,
      () => undefined,
    );
    const audio = await generation;
    workerContext.postMessage({
      type: "audio",
      requestId: request.requestId,
      blob: audio.toBlob(),
    });
  } catch (error) {
    if (request.type === "generate") {
      workerContext.postMessage({
        type: "generation-failed",
        requestId: request.requestId,
        message: readableError(error),
      });
      return;
    }
    workerContext.postMessage({ type: "failure", message: readableError(error) });
  }
};
