// import 'server-only';

export const EMBEDDING_DIMENSIONS = 384;

type FeatureExtractionOutput = {
  data: ArrayLike<number> & { slice(start: number, end: number): ArrayLike<number> };
};

type FeatureExtractionPipeline = (
  input: string | string[],
  options: { pooling: "mean"; normalize: true },
) => Promise<FeatureExtractionOutput>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getPipeline() {
  if (!pipelinePromise) {
    const { pipeline, env } = await import('@xenova/transformers');
    // Configure to download from HF hub and cache
    env.allowLocalModels = false;
    pipelinePromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    ) as Promise<FeatureExtractionPipeline>;
  }
  return pipelinePromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const extractor = await getPipeline();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    
    const result: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      const start = i * EMBEDDING_DIMENSIONS;
      const end = start + EMBEDDING_DIMENSIONS;
      result.push(Array.from(output.data.slice(start, end)));
    }
    return result;
  } catch (error) {
    throw new Error(`Failed to generate embeddings batch: ${error instanceof Error ? error.message : String(error)}`);
  }
}
