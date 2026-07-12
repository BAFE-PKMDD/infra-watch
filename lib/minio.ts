import * as Minio from "minio";
import { randomBytes } from "crypto";
import { Readable } from "stream";

export { getFileUrl, getFullUrl, isFullUrl } from "./minio-url";

const bucketName = process.env.MINIO_BUCKET_NAME || "infra-watch";

const minioConfig: Minio.ClientOptions = {
  endPoint: process.env.MINIO_ENDPOINT || "storage.bafe.online",
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
  ...(process.env.MINIO_PORT && { port: Number(process.env.MINIO_PORT) }),
};

export const minioClient = new Minio.Client(minioConfig);

export async function ensureBucketExists(): Promise<void> {
  const exists = await minioClient.bucketExists(bucketName);

  if (exists) {
    return;
  }

  await minioClient.makeBucket(bucketName, "us-east-1");

  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  };

  await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));

  try {
    await (minioClient as any).setBucketCors(bucketName, {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["PUT", "POST", "GET", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3000,
        },
      ],
    });
  } catch (error) {
    console.warn("Failed to set MinIO bucket CORS policy", error);
  }
}

export async function uploadFile(
  fileName: string,
  content: Buffer | Readable | ReadableStream | Blob,
  contentType: string,
  size: number,
): Promise<string> {
  await ensureBucketExists();

  let stream: Readable | Buffer;

  if (Buffer.isBuffer(content)) {
    stream = content;
  } else if (content instanceof Blob) {
    stream = Buffer.from(await content.arrayBuffer());
  } else if (content instanceof Readable) {
    stream = content;
  } else if (typeof (content as any).getReader === "function") {
    stream = Readable.fromWeb(content as any);
  } else {
    throw new Error("Invalid upload content");
  }

  await minioClient.putObject(bucketName, fileName, stream, size, {
    "Content-Type": contentType,
  });

  return fileName;
}

export async function deleteFile(fileName: string): Promise<void> {
  await minioClient.removeObject(bucketName, fileName);
}

export function generateUniqueFileName(
  originalName: string,
  folder = "articles",
): string {
  const timestamp = Date.now();
  const randomString = randomBytes(16).toString("hex");
  const extension = (originalName.split(".").pop() || "bin")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10);

  return `${folder}/${timestamp}-${randomString}.${extension}`;
}
