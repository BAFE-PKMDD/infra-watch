import { randomBytes } from "crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import * as Minio from "minio";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { isPrivateStoragePath } from "./minio-url";

export { getFileUrl, getFullUrl, isFullUrl } from "./minio-url";

const publicBucketName = process.env.MINIO_BUCKET_NAME || "infra-watch";
const privateBucketName = process.env.MINIO_PRIVATE_BUCKET_NAME || `${publicBucketName}-private`;
const publicMediaPrefixes = ["feedback", "feedback-comment", "live-videos"] as const;

type StorageAccess = "public" | "private";
type StorageBuckets = { publicBucket?: string; privateBucket?: string };

type BucketPolicy = {
  Version: "2012-10-17";
  Statement: Array<{
    Effect: "Allow";
    Principal: { AWS: string[] };
    Action: string[];
    Resource: string[];
  }>;
};

export function getStorageAccessForPath(fileName: string): StorageAccess {
  return isPrivateStoragePath(fileName) ? "private" : "public";
}

export function getStorageBucketForPath(
  fileName: string,
  config: StorageBuckets = {},
): string {
  const publicBucket = config.publicBucket ?? publicBucketName;
  const privateBucket = config.privateBucket ?? privateBucketName;
  if (publicBucket === privateBucket) {
    throw new Error("Public and private storage must use different buckets.");
  }
  return getStorageAccessForPath(fileName) === "private" ? privateBucket : publicBucket;
}

export function buildPublicReadPolicy(bucketName: string): BucketPolicy {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: publicMediaPrefixes.map((prefix) => `arn:aws:s3:::${bucketName}/${prefix}/*`),
      },
    ],
  };
}

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

function isMissingPolicyError(error: unknown) {
  const code = getStorageErrorCode(error);
  return code === "NoSuchBucketPolicy" || code === "NoSuchPolicy";
}

export function policyAllowsAnonymousRead(policyText: string) {
  try {
    const policy = JSON.parse(policyText) as {
      Statement?: Array<{
        Effect?: unknown;
        Principal?: unknown;
        NotPrincipal?: unknown;
      }>;
    };
    return (policy.Statement ?? []).some((statement) => {
      if (statement.Effect !== "Allow") return false;
      if (statement.NotPrincipal !== undefined) return true;

      const containsWildcard = (value: unknown): boolean => {
        if (value === "*") return true;
        if (Array.isArray(value)) return value.some(containsWildcard);
        if (typeof value === "object" && value !== null) {
          return Object.values(value).some(containsWildcard);
        }
        return false;
      };

      return statement.Principal === undefined || containsWildcard(statement.Principal);
    });
  } catch {
    return true;
  }
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

async function ensurePublicBucket(): Promise<void> {
  // Validate the global boundary before any bucket creation or policy write.
  getStorageBucketForPath("knowledge-base/policy-check.bin");
  const exists = await minioClient.bucketExists(publicBucketName);
  if (!exists) {
    await minioClient.makeBucket(publicBucketName, "us-east-1");
  }

  await minioClient.setBucketPolicy(
    publicBucketName,
    JSON.stringify(buildPublicReadPolicy(publicBucketName)),
  );

  try {
    await (minioClient as MinioClientWithCors).setBucketCors(publicBucketName, {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3000,
        },
      ],
    });
  } catch (error) {
    console.warn("Failed to set MinIO public bucket CORS policy", error);
  }
}

async function ensurePrivateBucket(): Promise<void> {
  getStorageBucketForPath("knowledge-base/policy-check.bin");
  const exists = await minioClient.bucketExists(privateBucketName);
  if (!exists) {
    await minioClient.makeBucket(privateBucketName, "us-east-1");
    return;
  }

  try {
    const policy = await minioClient.getBucketPolicy(privateBucketName);
    if (policy && policyAllowsAnonymousRead(policy)) {
      throw new Error(
        `Private MinIO bucket "${privateBucketName}" permits anonymous reads. Remove its public policy before starting InfraWatch.`,
      );
    }
  } catch (error) {
    if (!isMissingPolicyError(error)) {
      throw error;
    }
  }
}

export async function ensureStorageBuckets(): Promise<void> {
  await ensurePublicBucket();
  await ensurePrivateBucket();
}

export async function ensureBucketExists(fileName = "articles/default.bin"): Promise<void> {
  if (getStorageAccessForPath(fileName) === "private") {
    await ensurePublicBucket();
    await ensurePrivateBucket();
    return;
  }
  await ensurePublicBucket();
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
    await ensureBucketExists(fileName);
    await minioClient.putObject(getStorageBucketForPath(fileName), fileName, stream, size, {
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
    await minioClient.removeObject(getStorageBucketForPath(fileName), fileName);
    if (getStorageAccessForPath(fileName) === "private") {
      await minioClient.removeObject(publicBucketName, fileName).catch(() => undefined);
    }
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

async function readObject(bucketName: string, fileName: string): Promise<Buffer> {
  const fileStream = await minioClient.getObject(bucketName, fileName);
  const chunks: Buffer[] = [];
  for await (const chunk of fileStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function downloadFile(fileName: string): Promise<Buffer> {
  const access = getStorageAccessForPath(fileName);
  try {
    await ensureBucketExists(fileName);
    try {
      return await readObject(getStorageBucketForPath(fileName), fileName);
    } catch (error) {
      const code = getStorageErrorCode(error);
      if (access === "private" && (code === "NoSuchKey" || code === "NoSuchBucket")) {
        return await readObject(publicBucketName, fileName);
      }
      throw error;
    }
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
