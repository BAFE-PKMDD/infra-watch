require('dotenv').config({ path: '.env.local' });
const { minioClient } = require('./lib/minio');
const fs = require('fs');

async function testUpload() {
  try {
    console.log("Checking MinIO connection...");
    
    const bucket = process.env.MINIO_BUCKET_NAME || 'infra-watch';
    console.log("Bucket:", bucket);
    
    // Just list buckets to see if MinIO is reachable
    const buckets = await minioClient.listBuckets();
    console.log("Buckets:", buckets);
    
    console.log("MinIO connection successful.");
  } catch (err) {
    console.error("MinIO Error:", err);
  } finally {
    process.exit(0);
  }
}

testUpload();
