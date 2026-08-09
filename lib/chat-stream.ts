export const GENERIC_CHAT_ERROR =
  "Sorry, the AI service is temporarily unavailable. Please try again.";

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
  onError,
  onFinally,
  onCancel,
  onComplete,
}: {
  textStream: AsyncIterable<string>;
  terminalState: ChatStreamTerminalState;
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
        if (terminalNotice) {
          enqueueTerminalNotice(terminalNotice);
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
