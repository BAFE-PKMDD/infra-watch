import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed } from 'ai';
import 'dotenv/config';

async function run() {
  console.log('Generating embedding...');
  try {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    
    const embeddingModel = google.textEmbeddingModel('embedding-001');
    const { embedding } = await embed({
      model: embeddingModel,
      value: 'Testing text embedding',
    });

    console.log('Embedding length:', embedding.length);
    console.log('First 5 elements:', embedding.slice(0, 5));
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
