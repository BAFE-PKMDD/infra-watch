import { generateEmbedding } from './lib/kb-embedding';
import 'dotenv/config';

async function run() {
  console.log('Generating embedding...');
  try {
    const res = await generateEmbedding('Testing text embedding');
    console.log('Embedding length:', res.length);
    console.log('First 5 elements:', res.slice(0, 5));
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
