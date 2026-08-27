import type { TtsDtype, TtsWorkerRequest, TtsWorkerResponse } from "./tts-worker";

export type SpeechSynthesisEngine = {
  preload(): Promise<void>;
  generate(text: string): Promise<Blob>;
  isAlive(): boolean;
  dispose(): void;
};

type PendingGenerate = {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
};

export function createWorkerSpeechEngine(options: {
  model: string;
  dtype: TtsDtype;
  voice: string;
}): SpeechSynthesisEngine | null {
  if (typeof Worker === "undefined") return null;
  let worker: Worker;
  try {
    worker = new Worker("/ania/tts-worker.js", { type: "module" });
  } catch {
    return null;
  }

  let alive = true;
  let disposed = false;
  let fatalMessage: string | null = null;
  let nextRequestId = 1;
  let readyState: {
    promise: Promise<void>;
    settle: (error?: Error) => void;
  } | null = null;
  const pending = new Map<number, PendingGenerate>();

  const failAll = (message: string) => {
    fatalMessage ??= message;
    alive = false;
    for (const entry of pending.values()) entry.reject(new Error(message));
    pending.clear();
    readyState?.settle(new Error(message));
  };

  worker.onmessage = (event: MessageEvent<TtsWorkerResponse>) => {
    const message = event.data;
    if (message.type === "ready") {
      readyState?.settle();
      return;
    }
    if (message.type === "audio") {
      pending.get(message.requestId)?.resolve(message.blob);
      pending.delete(message.requestId);
      return;
    }
    if (message.type === "generation-failed") {
      pending.get(message.requestId)?.reject(new Error(message.message));
      pending.delete(message.requestId);
      return;
    }
    failAll(message.message);
  };
  worker.onerror = () => {
    if (!disposed) failAll("ANIA speech worker crashed.");
  };

  const requestReady = () => {
    if (!readyState) {
      let settle!: (error?: Error) => void;
      const promise = new Promise<void>((resolve, reject) => {
        settle = (error) => (error ? reject(error) : resolve());
      });
      readyState = { promise, settle };
      const request: TtsWorkerRequest = {
        type: "load",
        model: options.model,
        dtype: options.dtype,
      };
      worker.postMessage(request);
    }
    return readyState.promise;
  };

  return {
    preload() {
      return requestReady().then(() => undefined);
    },
    async generate(text: string) {
      await requestReady();
      if (!alive || disposed) {
        throw new Error(fatalMessage ?? "ANIA speech synthesis is unavailable.");
      }
      const requestId = nextRequestId;
      nextRequestId += 1;
      return new Promise<Blob>((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        const request: TtsWorkerRequest = {
          type: "generate",
          requestId,
          model: options.model,
          dtype: options.dtype,
          voice: options.voice,
          text,
        };
        worker.postMessage(request);
      });
    },
    isAlive() {
      return alive && !disposed;
    },
    dispose() {
      disposed = true;
      alive = false;
      for (const entry of pending.values()) {
        entry.reject(new Error("ANIA speech synthesis was stopped."));
      }
      pending.clear();
      readyState?.settle(new Error("ANIA speech synthesis was stopped."));
      worker.terminate();
    },
  };
}
