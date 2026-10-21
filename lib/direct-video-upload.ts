import { and, count, eq, gt, inArray, lt } from "drizzle-orm";
import { CopyDestinationOptions, CopySourceOptions } from "minio";
import { z } from "zod";
import { db } from "@/lib/db";
import { uploadSessions } from "@/lib/db/schema";
import {
  directUploadSchema,
  UPLOAD_PART_SIZE,
  validateUploadParts,
} from "@/lib/operations-models";
import {
  ensureStorageBuckets,
  generateUniqueFileName,
  getStorageBucketForPath,
  minioClient,
} from "@/lib/minio";
import { hasValidMagicBytes } from "@/lib/upload-validation";

type Upload = typeof uploadSessions.$inferSelect;
function stagingPath(upload: Upload) {
  return `upload-staging/${upload.id}.${upload.path.split(".").pop()}`;
}
const privateBucket = () =>
  getStorageBucketForPath("knowledge-base/upload.bin");

export async function createDirectUpload(userId: string, input: unknown) {
  const data = directUploadSchema.parse(input);
  const extension = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  }[data.type];
  if (
    !data.name.toLowerCase().endsWith(`.${extension}`) &&
    !(data.type === "video/mp4" && data.name.toLowerCase().endsWith(".m4v"))
  )
    throw Object.assign(new Error("Video filename and type do not match"), {
      status: 400,
    });
  await ensureStorageBuckets();
  const id = crypto.randomUUID();
  const upload = await db.transaction(async (tx) => {
    await tx.execute(
      (await import("drizzle-orm"))
        .sql`SELECT pg_advisory_xact_lock(hashtextextended(${`uploads:${userId}`}, 0))`,
    );
    const [{ total }] = await tx
      .select({ total: count() })
      .from(uploadSessions)
      .where(
        and(
          eq(uploadSessions.userId, userId),
          inArray(uploadSessions.status, ["uploading", "completing"]),
          gt(uploadSessions.expiresAt, new Date()),
        ),
      );
    if (total >= 3)
      throw Object.assign(
        new Error(
          "Finish or cancel an existing upload before starting another",
        ),
        { status: 429 },
      );
    const [row] = await tx
      .insert(uploadSessions)
      .values({
        id,
        userId,
        path: generateUniqueFileName(`video.${extension}`, "live-videos"),
        contentType: data.type,
        size: data.size,
        partSize: UPLOAD_PART_SIZE,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning();
    return row;
  });
  try {
    if (data.size >= 100 * 1024 * 1024) {
      const uploadId = await minioClient.initiateNewMultipartUpload(
        privateBucket(),
        stagingPath(upload),
        { "Content-Type": data.type },
      );
      await db
        .update(uploadSessions)
        .set({ uploadId })
        .where(eq(uploadSessions.id, upload.id));
      return { id, multipart: true, partSize: UPLOAD_PART_SIZE };
    }
    return {
      id,
      multipart: false,
      url: await minioClient.presignedPutObject(
        privateBucket(),
        stagingPath(upload),
        1800,
      ),
    };
  } catch (error) {
    await db
      .update(uploadSessions)
      .set({ status: "aborted" })
      .where(eq(uploadSessions.id, id));
    throw error;
  }
}

export async function ownedUpload(userId: string, id: string) {
  const [upload] = await db
    .select()
    .from(uploadSessions)
    .where(
      and(
        eq(uploadSessions.id, z.uuid().parse(id)),
        eq(uploadSessions.userId, userId),
      ),
    )
    .limit(1);
  if (!upload)
    throw Object.assign(new Error("Upload not found"), { status: 404 });
  if (upload.status !== "completed" && upload.expiresAt < new Date())
    throw Object.assign(new Error("Upload expired. Start again."), {
      status: 410,
    });
  return upload;
}

export async function presignPart(upload: Upload, partNumber: number) {
  if (
    upload.status !== "uploading" ||
    !upload.uploadId ||
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > Math.ceil(upload.size / upload.partSize)
  )
    throw Object.assign(new Error("Invalid upload part"), { status: 400 });
  return minioClient.presignedUrl(
    "PUT",
    privateBucket(),
    stagingPath(upload),
    1800,
    { uploadId: upload.uploadId, partNumber: String(partNumber) },
  );
}

export async function completeDirectUpload(
  upload: Upload,
  parts: { partNumber: number; etag: string }[],
) {
  if (upload.status === "completed") return upload.path;
  if (upload.status !== "uploading")
    throw Object.assign(new Error("This upload is no longer accepting parts"), {
      status: 409,
    });
  if (upload.uploadId) validateUploadParts(upload.size, parts);
  const [claimed] = await db
    .update(uploadSessions)
    .set({
      status: "completing",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    })
    .where(
      and(
        eq(uploadSessions.id, upload.id),
        eq(uploadSessions.status, "uploading"),
      ),
    )
    .returning();
  if (!claimed)
    throw Object.assign(new Error("Upload completion is already in progress"), {
      status: 409,
    });
  try {
    if (upload.uploadId) {
      const alreadyComplete = await minioClient
        .statObject(privateBucket(), stagingPath(upload))
        .then(() => true)
        .catch(() => false);
      if (!alreadyComplete)
        await minioClient.completeMultipartUpload(
          privateBucket(),
          stagingPath(upload),
          upload.uploadId,
          parts.map((part) => ({ part: part.partNumber, etag: part.etag })),
        );
    }
    const stat = await minioClient.statObject(
      privateBucket(),
      stagingPath(upload),
    );
    if (
      stat.size !== upload.size ||
      stat.metaData["content-type"] !== upload.contentType
    )
      throw Object.assign(
        new Error("Uploaded video size or content type does not match"),
        { status: 400 },
      );
    const stream = await minioClient.getPartialObject(
      privateBucket(),
      stagingPath(upload),
      0,
      512,
    );
    const buffers: Buffer[] = [];
    for await (const chunk of stream) buffers.push(Buffer.from(chunk));
    const bytes = Buffer.concat(buffers);
    if (!hasValidMagicBytes(bytes, upload.contentType))
      throw Object.assign(
        new Error("The uploaded file is not a supported video"),
        { status: 400 },
      );
    // composeObject performs a multipart server-side copy for recordings over 5 GB.
    await minioClient.composeObject(
      new CopyDestinationOptions({
        Bucket: getStorageBucketForPath(upload.path),
        Object: upload.path,
        MetadataDirective: "REPLACE",
        Headers: { "Content-Type": upload.contentType },
      }),
      [
        new CopySourceOptions({
          Bucket: privateBucket(),
          Object: stagingPath(upload),
          MatchETag: stat.etag,
        }),
      ],
    );
    await db
      .update(uploadSessions)
      .set({ status: "completed" })
      .where(eq(uploadSessions.id, upload.id));
    await minioClient
      .removeObject(privateBucket(), stagingPath(upload))
      .catch(() => {});
    return upload.path;
  } catch (error) {
    await db
      .update(uploadSessions)
      .set({
        status: "uploading",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .where(
        and(
          eq(uploadSessions.id, upload.id),
          eq(uploadSessions.status, "completing"),
        ),
      );
    throw error;
  }
}

export async function abortDirectUpload(upload: Upload) {
  if (upload.status === "completed")
    throw Object.assign(new Error("This upload is already completed"), {
      status: 409,
    });
  const [claimed] = await db
    .update(uploadSessions)
    .set({ status: "aborted" })
    .where(
      and(
        eq(uploadSessions.id, upload.id),
        eq(uploadSessions.status, "uploading"),
      ),
    )
    .returning();
  if (!claimed)
    throw Object.assign(
      new Error("Cannot cancel an upload while completion is in progress"),
      { status: 409 },
    );
  if (upload.uploadId)
    await minioClient
      .abortMultipartUpload(
        privateBucket(),
        stagingPath(upload),
        upload.uploadId,
      )
      .catch(() => {});
  await minioClient
    .removeObject(privateBucket(), stagingPath(upload))
    .catch(() => {});
  await minioClient
    .removeObject(getStorageBucketForPath(upload.path), upload.path)
    .catch(() => {});
}

/** Remove abandoned private parts and incomplete copies; completed recordings are never selected. */
export async function cleanExpiredUploads() {
  const now = new Date();
  const expired = await db
    .select()
    .from(uploadSessions)
    .where(
      and(
        inArray(uploadSessions.status, ["uploading", "completing", "aborted"]),
        lt(uploadSessions.expiresAt, now),
      ),
    )
    .limit(10);
  for (const upload of expired) {
    const [claimed] = await db
      .update(uploadSessions)
      .set({
        status: "aborted",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      .where(
        and(
          eq(uploadSessions.id, upload.id),
          eq(uploadSessions.status, upload.status),
          lt(uploadSessions.expiresAt, now),
        ),
      )
      .returning();
    if (!claimed) continue;
    if (upload.uploadId)
      await minioClient
        .abortMultipartUpload(
          privateBucket(),
          stagingPath(upload),
          upload.uploadId,
        )
        .catch((error) => {
          if ((error as { code?: string }).code !== "NoSuchUpload") throw error;
        });
    await minioClient.removeObject(privateBucket(), stagingPath(upload));
    await minioClient.removeObject(
      getStorageBucketForPath(upload.path),
      upload.path,
    );
    await db
      .delete(uploadSessions)
      .where(
        and(
          eq(uploadSessions.id, upload.id),
          eq(uploadSessions.status, "aborted"),
        ),
      );
  }
}
