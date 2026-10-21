import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { downloadFile } from "@/lib/minio";
import { moderateImageBuffer } from "@/lib/services/content-moderation";
import { videoSampleTimes } from "@/lib/operations-models";

const execute = promisify(execFile);

export async function moderateStoredVideo(storagePath: string) {
  if (
    !/^(?:feedback|feedback-comment)\/\d+-[a-f\d]{32}\.(?:mp4|mov|webm)$/i.test(
      storagePath,
    )
  )
    throw new Error("Unsupported video storage path");
  const directory = await mkdtemp(path.join(tmpdir(), "infrawatch-review-"));
  try {
    const buffer = await downloadFile(storagePath);
    if (buffer.length > 512 * 1024 * 1024)
      throw new Error("Video is too large for automated review");
    const source = path.join(directory, "source" + path.extname(storagePath));
    await writeFile(source, buffer);
    const { stdout } = await execute(
      process.env.FFPROBE_PATH || "ffprobe",
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        source,
      ],
      { timeout: 30_000, maxBuffer: 32768, windowsHide: true },
    );
    const duration = Number(
      (JSON.parse(stdout) as { format?: { duration?: string } }).format
        ?.duration,
    );
    let index = 0;
    for (const time of videoSampleTimes(duration)) {
      const frame = path.join(directory, `frame-${index++}.jpg`);
      await execute(
        process.env.FFMPEG_PATH || "ffmpeg",
        [
          "-v",
          "error",
          "-protocol_whitelist",
          "file,pipe",
          "-ss",
          String(time),
          "-i",
          source,
          "-frames:v",
          "1",
          "-vf",
          "scale=512:512:force_original_aspect_ratio=decrease",
          "-y",
          frame,
        ],
        { timeout: 30_000, maxBuffer: 32768, windowsHide: true },
      );
      const result = await moderateImageBuffer(await readFile(frame));
      if (result.flaggedCategory === "Analysis Failed")
        throw new Error("Video frame analysis is unavailable");
      if (result.isNSFW)
        return {
          isNSFW: true,
          reason: "Video frames contain inappropriate content",
        };
    }
    return { isNSFW: false, reason: null };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
