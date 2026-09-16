import * as Minio from "minio";
import { randomBytes } from "crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export { getFileUrl, getFullUrl, isFullUrl } from "./minio-url";

const bucketName = process.env.MINIO_BUCKET_NAME || "infra-watch";

type BucketCorsConfiguration = {
  CORSRules: Array<{
    AllowedHeaders: string[];
    AllowedMethods: string[];
    AllowedOrigins: string[];
    ExposeHeaders: string[];
    MaxAgeSeconds: number;
  }>;
};

type MinioClientWithCors = Minio.Client & {
  setBucketCors(bucket: string, configuration: BucketCorsConfiguration): Promise<void>;
};

function getStorageErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

function isWebReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  if (typeof value !== "object" || value === null || !("getReader" in value)) {
    return false;
  }

  return typeof value.getReader === "function";
}

const minioConfig: Minio.ClientOptions = {
  endPoint: process.env.MINIO_ENDPOINT || "storage.bafe.gov.ph",
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
    await (minioClient as MinioClientWithCors).setBucketCors(bucketName, {
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
  let stream: Readable | Buffer;

  if (Buffer.isBuffer(content)) {
    stream = content;
  } else if (content instanceof Blob) {
    stream = Buffer.from(await content.arrayBuffer());
  } else if (content instanceof Readable) {
    stream = content;
  } else if (isWebReadableStream(content)) {
    stream = Readable.fromWeb(
      content as unknown as import("stream/web").ReadableStream<Uint8Array>,
    );
  } else {
    throw new Error("Invalid upload content");
  }

  try {
    await ensureBucketExists();
    await minioClient.putObject(bucketName, fileName, stream, size, {
      "Content-Type": contentType,
    });
  } catch (error: unknown) {
    const code = getStorageErrorCode(error);
    if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
      console.warn("MinIO unreachable, falling back to local file system.");
      const storageDir = path.join(process.cwd(), ".storage");
      const fullPath = path.join(storageDir, fileName);
      mkdirSync(path.dirname(fullPath), { recursive: true });

      if (Buffer.isBuffer(stream)) {
        writeFileSync(fullPath, stream);
      } else {
        await pipeline(stream, createWriteStream(fullPath));
      }
    } else {
      throw error;
    }
  }

  return fileName;
}

export async function deleteFile(fileName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucketName, fileName);
  } catch (error: unknown) {
    const code = getStorageErrorCode(error);
    if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
      const fullPath = path.join(process.cwd(), ".storage", fileName);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
    } else {
      throw error;
    }
  }
}

export async function downloadFile(fileName: string): Promise<Buffer> {
  try {
    const fileStream = await minioClient.getObject(bucketName, fileName);
    const chunks: Buffer[] = [];
    for await (const chunk of fileStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (error: unknown) {
    const code = getStorageErrorCode(error);
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "NoSuchKey") {
      const fullPath = path.join(process.cwd(), ".storage", fileName);
      if (existsSync(fullPath)) return readFileSync(fullPath);
    }
    throw error;
  }
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
