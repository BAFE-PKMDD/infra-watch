export type NodeRuntimeDependencies = {
  reconcileStorage: () => Promise<void>;
  startScheduler: () => void;
};

export function shouldReconcileStorageAtStartup(environment: {
  nodeEnv?: string;
  nextPhase?: string;
}): boolean {
  return environment.nodeEnv === "production"
    && environment.nextPhase !== "phase-production-build";
}

const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

function hasTransientNetworkCode(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, cause } = error as { code?: unknown; cause?: unknown };
  if (typeof code === "string" && TRANSIENT_NETWORK_CODES.has(code)) return true;
  return cause !== undefined && cause !== error && hasTransientNetworkCode(cause);
}

export type StorageReconcileRetryOptions = {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

// A brief network failure while the storage endpoint is being reached must not leave
// the server permanently unprepared, so connection-level failures are retried. Any other
// failure (for example a private bucket that permits anonymous reads) still fails
// closed immediately, and so does a storage endpoint that stays unreachable.
async function reconcileStorageWithRetry(
  reconcileStorage: () => Promise<void>,
  { attempts = 6, delayMs = 3_000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }: StorageReconcileRetryOptions,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await reconcileStorage();
      return;
    } catch (error) {
      if (attempt >= attempts || !hasTransientNetworkCode(error)) throw error;
      console.warn(`Storage not reachable at startup (attempt ${attempt} of ${attempts}); retrying.`);
      await sleep(delayMs * attempt);
    }
  }
}

export async function initializeNodeRuntime(
  dependencies: NodeRuntimeDependencies,
  retry: StorageReconcileRetryOptions = {},
): Promise<void> {
  await reconcileStorageWithRetry(dependencies.reconcileStorage, retry);
  dependencies.startScheduler();
}
