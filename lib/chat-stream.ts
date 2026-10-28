export const GENERIC_CHAT_ERROR =
  "Sorry, the AI service is temporarily unavailable. Please try again.";

import { getIncompleteAnswerNotice } from "./chat-generation";

const FINISH_REASON_WAIT_MS = 2_000;

async function resolveIncompleteAnswerNotice(
  getFinishReason: (() => PromiseLike<string>) | undefined,
) {
  if (!getFinishReason) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const finishReason = await Promise.race([
      Promise.resolve(getFinishReason()),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), FINISH_REASON_WAIT_MS);
      }),
    ]);
    return getIncompleteAnswerNotice(finishReason);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type ChatStreamTerminalState = {
  getNotice(): string | null;
  markProviderError(): void;
  markRequestAborted(): void;
  markTimeout(notice: string): void;
  shouldSuppressFallbackNotice(): boolean;
};

export function createChatStreamTerminalState(): ChatStreamTerminalState {
  let terminalNotice: string | null = null;
  let suppressFallbackNotice = false;

  return {
    getNotice: () => terminalNotice,
    markProviderError: () => {
      terminalNotice = GENERIC_CHAT_ERROR;
      suppressFallbackNotice = false;
    },
    markRequestAborted: () => {
      terminalNotice = null;
      suppressFallbackNotice = true;
    },
    markTimeout: (notice) => {
      terminalNotice = notice;
      suppressFallbackNotice = false;
    },
    shouldSuppressFallbackNotice: () => suppressFallbackNotice,
  };
}

export function createChatResponseStream({
  textStream,
  terminalState,
  getFinishReason,
  onError,
  onFinally,
  onCancel,
  onComplete,
}: {
  textStream: AsyncIterable<string>;
  terminalState: ChatStreamTerminalState;
  /** Resolves to the provider finish reason; "length" appends a cut-off notice. */
  getFinishReason?: () => PromiseLike<string>;
  onError?: (error: unknown) => void;
  onFinally?: () => void;
  onCancel?: () => void;
  onComplete?: (emittedText: string) => void | Promise<void>;
}) {
  const encoder = new TextEncoder();
  let iterator: AsyncIterator<string> | null = null;
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let emittedText = "";
      let emittedTerminalNotice = false;
      let completedText: string | null = null;
      const enqueueTerminalNotice = (notice: string) => {
        controller.enqueue(
          encoder.encode(emittedText ? `\n\n${notice}` : notice),
        );
        emittedTerminalNotice = true;
      };

      try {
        iterator = textStream[Symbol.asyncIterator]();
        while (!cancelled) {
          const { done, value: chunk } = await iterator.next();
          if (done || cancelled) break;
          emittedText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        if (cancelled) return;
        const terminalNotice = terminalState.getNotice();
        const incompleteNotice =
          terminalNotice || terminalState.shouldSuppressFallbackNotice()
            ? null
            : await resolveIncompleteAnswerNotice(getFinishReason);
        if (cancelled) return;
        if (terminalNotice) {
          enqueueTerminalNotice(terminalNotice);
        } else if (incompleteNotice) {
          enqueueTerminalNotice(incompleteNotice);
        } else if (
          !emittedText &&
          !terminalState.shouldSuppressFallbackNotice()
        ) {
          enqueueTerminalNotice(GENERIC_CHAT_ERROR);
        }
        completedText = emittedText;
      } catch (error) {
        if (!cancelled && !terminalState.shouldSuppressFallbackNotice()) {
          onError?.(error);
          if (!emittedTerminalNotice) {
            enqueueTerminalNotice(
              terminalState.getNotice() ?? GENERIC_CHAT_ERROR,
            );
          }
        }
      } finally {
        onFinally?.();
        if (!cancelled) {
          controller.close();
          try {
            const completion =
              completedText === null ? undefined : onComplete?.(completedText);
            if (completion) {
              void completion.catch((error) => onError?.(error));
            }
          } catch (error) {
            onError?.(error);
          }
        }
      }
    },
    async cancel() {
      if (cancelled) return;
      cancelled = true;
      onCancel?.();
      await iterator?.return?.();
    },
  });
}
