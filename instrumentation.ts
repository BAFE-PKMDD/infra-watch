/**
 * Next.js Instrumentation
 * Runs once when the server starts
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register() {
  // Only run on the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ initScheduler }, { initializeNodeRuntime, shouldReconcileStorageAtStartup }] = await Promise.all([
      import("./lib/scheduler"),
      import("./lib/server-startup"),
    ]);

    if (shouldReconcileStorageAtStartup({
      nodeEnv: process.env.NODE_ENV,
      nextPhase: process.env.NEXT_PHASE,
    })) {
      const { ensureStorageBuckets } = await import("./lib/minio");
      await initializeNodeRuntime({
        reconcileStorage: ensureStorageBuckets,
        startScheduler: initScheduler,
      });
      return;
    }

    initScheduler();
  }
}
