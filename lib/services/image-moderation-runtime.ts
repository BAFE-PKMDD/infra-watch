type ReadyRuntime = {
  ready: () => Promise<void>;
};

type ImageModerationRuntimeOptions<TRuntime extends ReadyRuntime, TModel> = {
  loadRuntime: () => Promise<TRuntime>;
  loadModel: () => Promise<TModel>;
};

export async function initializeImageModerationRuntime<
  TRuntime extends ReadyRuntime,
  TModel,
>({
  loadRuntime,
  loadModel,
}: ImageModerationRuntimeOptions<TRuntime, TModel>) {
  const runtime = await loadRuntime();
  await runtime.ready();
  const model = await loadModel();

  return { runtime, model };
}
