require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const query = "bakit ginawa ang infra watch";
    console.log("Generating embedding for query...");
    const { pipeline, env } = await import('@xenova/transformers');
    env.allowLocalModels = false;
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await extractor(query, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);
    
    console.log("Query embedding length:", queryEmbedding.length);

    console.log("Fetching chunks from DB...");
    const allChunks = await sql`SELECT id, document_id, content, embedding FROM kb_chunks`;
    console.log(`Found ${allChunks.length} chunks in DB.`);
    
    const results = [];
    for (const chunk of allChunks) {
      if (!chunk.embedding) continue;
      // chunk.embedding is parsed as a JSON array from JSONB by postgres.js
      const sim = cosineSimilarity(queryEmbedding, chunk.embedding);
      results.push({ id: chunk.id, content: chunk.content, sim });
    }
    
    results.sort((a, b) => b.sim - a.sim);
    console.log("Top 5 results:");
    console.log(results.slice(0, 5));
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
