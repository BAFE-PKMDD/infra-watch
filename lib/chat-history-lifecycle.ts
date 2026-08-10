type HistoryWrite = () => Promise<void>;

type ChatHistoryLifecycleOptions = {
  onWriteError?: (error: unknown) => void;
};

export function createChatHistoryLifecycle(
  options: ChatHistoryLifecycleOptions = {},
) {
  let invalidated = false;
  let completionWrite: Promise<void> | null = null;
  let terminalWrite: Promise<void> | null = null;
  const handleWriteError = (error: unknown) => options.onWriteError?.(error);

  return {
    isInvalidated: () => invalidated,
    beginCompletion(write: HistoryWrite) {
      if (invalidated || completionWrite || terminalWrite) return false;

      completionWrite = Promise.resolve().then(write);
      void completionWrite.catch(handleWriteError);
      return true;
    },
    settleTerminal(write: HistoryWrite) {
      invalidated = true;
      if (terminalWrite) return terminalWrite;

      terminalWrite = (async () => {
        try {
          await completionWrite;
        } catch {
          // The terminal write still needs to run after a failed completion write.
        }
        await write();
      })();
      void terminalWrite.catch(handleWriteError);
      return terminalWrite;
    },
  };
}
