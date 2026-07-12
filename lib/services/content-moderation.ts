import "server-only";

import { Filter } from "bad-words";
import type * as nsfwjs from "nsfwjs";

type ImageModerationResult = {
  isNSFW: boolean;
  predictions: nsfwjs.PredictionType[];
  flaggedCategory?: string;
  confidence?: number;
};

let model: nsfwjs.NSFWJS | null = null;
let isModelLoading = false;

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

const PORN_THRESHOLD = envNumber("NSFW_PORN_THRESHOLD", 0.4);
const HENTAI_THRESHOLD = envNumber("NSFW_HENTAI_THRESHOLD", 0.4);
const SEXY_THRESHOLD = envNumber("NSFW_SEXY_THRESHOLD", 0.25);
const FAIL_CLOSED = process.env.NSFW_FAIL_CLOSED !== "false";

export function isImageModerationEnabled() {
  return process.env.NSFW_IMAGE_MODERATION_ENABLED !== "false";
}

async function getNSFWModel() {
  if (model) return model;

  if (isModelLoading) {
    while (isModelLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return model;
  }

  isModelLoading = true;
  try {
    const nsfw = await import("nsfwjs");
    model = await nsfw.load("MobileNetV2Mid");
    return model;
  } finally {
    isModelLoading = false;
  }
}

export function resetNSFWModel() {
  model = null;
  isModelLoading = false;
}

const filter = new Filter();
const tagalogProfanity = [
  "putangina", "tangina", "puta", "gago", "gaga", "tarantado", "ulol", "buwisit", "leche", "lintik", "hindot", "punyeta",
  "kantot", "iyot", "tite", "kiki", "pepek", "puki", "burat", "betlog", "etits", "jakol", "tamod",
  "bobo", "tanga", "engot", "inutil", "ungas", "kupal", "ogag", "pokpok",
  "pota", "amputa", "fota", "deputa", "pucha", "tanginamo", "gagi",
];

filter.addWords(...tagalogProfanity);

const tagalogOnlyFilter = new Filter({ emptyList: true });
tagalogOnlyFilter.addWords(...tagalogProfanity);

const fuzzyPatterns = [
  /p[\W_]*u[\W_]*t[\W_]*a/i,
  /t[\W_]*a[\W_]*n[\W_]*g[\W_]*i[\W_]*n[\W_]*a/i,
  /g[\W_]*a[\W_]*g[\W_]*o/i,
  /f[\W_]*u[\W_]*c[\W_]*k/i,
  /s[\W_]*h[\W_]*i[\W_]*t/i,
  /b[\W_]*o[\W_]*b[\W_]*o/i,
];

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[!1]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[3]/g, "e")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/[^a-z\s]/g, "");
}

export function moderateText(text: string): {
  hasProfanity: boolean;
  cleanText: string;
} {
  try {
    if (filter.isProfane(text)) {
      return { hasProfanity: true, cleanText: filter.clean(text) };
    }

    const lower = text.toLowerCase();
    for (const pattern of fuzzyPatterns) {
      if (pattern.test(lower)) {
        return { hasProfanity: true, cleanText: text.replace(pattern, "****") };
      }
    }

    const normalized = normalizeText(text);
    if (filter.isProfane(normalized)) {
      return { hasProfanity: true, cleanText: "****" };
    }

    const words = normalized.split(/\s+/).filter(Boolean);
    for (let windowSize = 2; windowSize <= Math.min(3, words.length); windowSize++) {
      for (let index = 0; index <= words.length - windowSize; index++) {
        const chunk = words.slice(index, index + windowSize).join("");
        if (filter.isProfane(chunk)) {
          return { hasProfanity: true, cleanText: "****" };
        }
      }
    }

    const fullyCollapsed = normalized.replace(/(.)\1+/g, "$1");
    if (tagalogOnlyFilter.isProfane(fullyCollapsed)) {
      return { hasProfanity: true, cleanText: "****" };
    }

    return { hasProfanity: false, cleanText: text };
  } catch (error) {
    console.error("Text content moderation failed", error);
    return { hasProfanity: false, cleanText: text };
  }
}

export function assertCleanText(text: string) {
  if (moderateText(text).hasProfanity) {
    throw new Error("Your message contains inappropriate language. Please revise it before submitting.");
  }
}

function findFlaggedPrediction(predictions: nsfwjs.PredictionType[]) {
  return predictions.find((prediction) => {
    if (prediction.className === "Porn") return prediction.probability > PORN_THRESHOLD;
    if (prediction.className === "Hentai") return prediction.probability > HENTAI_THRESHOLD;
    if (prediction.className === "Sexy") return prediction.probability > SEXY_THRESHOLD;
    return false;
  });
}

async function prepareTensorflowNativeRuntime() {
  if (process.platform !== "win32") return;

  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const tfjsNodeRoot = path.dirname(require.resolve("@tensorflow/tfjs-node/package.json"));
    const sourceDll = path.join(tfjsNodeRoot, "deps", "lib", "tensorflow.dll");
    const libRoot = path.join(tfjsNodeRoot, "lib");
    const entries = await fs.readdir(libRoot, { withFileTypes: true });

    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("napi-v"))
        .map(async (entry) => {
          const bindingPath = path.join(libRoot, entry.name, "tfjs_binding.node");
          const dllPath = path.join(libRoot, entry.name, "tensorflow.dll");

          try {
            await fs.access(bindingPath);
            await fs.access(dllPath);
          } catch {
            await fs.copyFile(sourceDll, dllPath);
          }
        }),
    );
  } catch (error) {
    console.warn("Unable to prepare TensorFlow native runtime", error);
  }
}

export async function moderateImageBuffer(buffer: Buffer): Promise<ImageModerationResult> {
  if (!isImageModerationEnabled()) {
    return { isNSFW: false, predictions: [] };
  }

  let imageTensor: { dispose?: () => void } | null = null;

  try {
    const nsfwModel = await getNSFWModel();
    if (!nsfwModel) throw new Error("NSFW model could not be loaded");

    await prepareTensorflowNativeRuntime();
    const tf = await import("@tensorflow/tfjs-node");
    const sharp = (await import("sharp")).default;

    const pngBuffer = await sharp(buffer).png().toBuffer();
    imageTensor = tf.node.decodeImage(pngBuffer, 3);

    const predictions = await nsfwModel.classify(imageTensor as any);
    const flagged = findFlaggedPrediction(predictions);

    return {
      isNSFW: Boolean(flagged),
      predictions,
      flaggedCategory: flagged?.className,
      confidence: flagged?.probability,
    };
  } catch (error) {
    console.error("Image content moderation failed", error);

    return {
      isNSFW: FAIL_CLOSED,
      predictions: [],
      flaggedCategory: "Analysis Failed",
      confidence: 1,
    };
  } finally {
    imageTensor?.dispose?.();
  }
}

export async function assertSafeImageUpload(buffer: Buffer) {
  const result = await moderateImageBuffer(buffer);

  if (result.isNSFW) {
    const detail = result.flaggedCategory && result.flaggedCategory !== "Analysis Failed"
      ? ` (${result.flaggedCategory}, ${Math.round((result.confidence ?? 0) * 100)}%)`
      : "";

    throw new Error(`Image contains inappropriate content and cannot be uploaded${detail}.`);
  }
}
