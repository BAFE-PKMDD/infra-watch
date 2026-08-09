import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Supported AI providers.
 * Configure via AI_PROVIDER and AI_MODEL env vars.
 *
 * Provider        | AI_PROVIDER value | Default model            | API key env var
 * --------------- | ----------------- | ------------------------ | ---------------
 * Google Gemini   | "google"/"gemini" | gemini-flash-latest      | GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY
 * OpenAI / GPT    | "openai"          | gpt-4o-mini              | OPENAI_API_KEY
 * Anthropic Claude| "anthropic"       | claude-sonnet-4-20250514 | ANTHROPIC_API_KEY
 * Moonshot Kimi   | "kimi"            | moonshot-v1-8k           | KIMI_API_KEY
 */

const DEFAULT_MODELS: Record<string, string> = {
  google: "gemini-flash-latest",
  gemini: "gemini-flash-latest",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  kimi: "moonshot-v1-8k",
};

export function getAIConfig() {
  const provider = (process.env.AI_PROVIDER ?? "google").toLowerCase();
  const defaultModelId =
    process.env.AI_MODEL?.trim() ||
    DEFAULT_MODELS[provider] ||
    DEFAULT_MODELS.google;
  const modelId =
    provider === "google" || provider === "gemini"
      ? process.env.GEMINI_MODEL?.trim() || defaultModelId
      : defaultModelId;

  return { provider, modelId };
}

export function getAIModel(): LanguageModel {
  const { provider, modelId } = getAIConfig();

  switch (provider) {
    case "google":
    case "gemini": {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        baseURL: process.env.GEMINI_BASE_URL,
      });
      return google(modelId);
    }

    case "openai":
      return openai(modelId);

    case "anthropic":
      return anthropic(modelId);

    case "kimi": {
      const kimi = createOpenAI({
        baseURL: "https://api.moonshot.cn/v1",
        apiKey: process.env.KIMI_API_KEY,
      });
      return kimi(modelId);
    }

    default:
      throw new Error(
        `Unsupported AI_PROVIDER: "${provider}". Use one of: google, openai, anthropic, kimi`,
      );
  }
}

export function getProviderName(): string {
  return (process.env.AI_PROVIDER ?? "google").toLowerCase();
}
