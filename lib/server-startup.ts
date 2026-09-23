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

export async function initializeNodeRuntime(
  dependencies: NodeRuntimeDependencies,
): Promise<void> {
  await dependencies.reconcileStorage();
  dependencies.startScheduler();
}
