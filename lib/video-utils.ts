/**
 * URL validation and embed helpers for externally hosted video sources.
 */

export type ExternalVideoType = "facebook_live" | "youtube";

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
]);
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);
const YOUTUBE_PRIVACY_HOSTS = new Set([
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function parseSecurePublicUrl(value: string | null | undefined): URL | null {
  if (!value) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Validates a public Facebook video URL and returns its trimmed form.
 */
export function normalizeFacebookVideoUrl(url: string | null | undefined): string | null {
  const parsed = parseSecurePublicUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (host === "fb.watch") {
    const token = segments[0];
    const reserved = new Set(["about", "help", "login", "privacy", "terms"]);
    return token && !reserved.has(token.toLowerCase()) ? parsed.toString() : null;
  }

  if (!FACEBOOK_HOSTS.has(host) || parsed.pathname.startsWith("/plugins/")) return null;

  const watchId = parsed.pathname === "/watch/" || parsed.pathname === "/watch"
    ? parsed.searchParams.get("v")
    : null;
  const videosIndex = segments.indexOf("videos");
  const pathVideoId = videosIndex >= 1 ? segments[videosIndex + 1] : null;
  const isSharedVideo = segments[0] === "share" && segments[1] === "v" && Boolean(segments[2]);
  const isReel = segments[0] === "reel" && Boolean(segments[1]);

  if (
    (watchId && /^\d+$/.test(watchId)) ||
    (pathVideoId && /^\d+$/.test(pathVideoId)) ||
    isSharedVideo ||
    isReel
  ) {
    return parsed.toString();
  }

  return null;
}

/** Converts a validated Facebook video URL to the Facebook video plugin URL. */
export function getFacebookEmbedUrl(url: string | null | undefined): string | null {
  const normalized = normalizeFacebookVideoUrl(url);
  if (!normalized) return null;

  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&show_text=false&width=1280`;
}

/** Extracts an 11-character YouTube video ID from supported public URL forms. */
export function getYouTubeVideoId(url: string | null | undefined): string | null {
  const parsed = parseSecurePublicUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);
  let candidate: string | null = null;

  if (host === "youtu.be" || host === "www.youtu.be") {
    candidate = segments[0] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (parsed.pathname === "/watch" || parsed.pathname === "/watch/") {
      candidate = parsed.searchParams.get("v");
    } else if (["shorts", "live", "embed", "v"].includes(segments[0] ?? "")) {
      candidate = segments[1] ?? null;
    }
  } else if (YOUTUBE_PRIVACY_HOSTS.has(host) && segments[0] === "embed") {
    candidate = segments[1] ?? null;
  }

  return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
}

/** Returns a tracking-free canonical YouTube watch URL. */
export function normalizeYouTubeVideoUrl(url: string | null | undefined): string | null {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

/** Returns a privacy-enhanced YouTube iframe URL. */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : null;
}

/** Builds an iframe source only when the URL matches the selected provider. */
export function getVideoEmbedUrl(
  videoType: ExternalVideoType,
  url: string | null | undefined,
): string | null {
  return videoType === "youtube"
    ? getYouTubeEmbedUrl(url)
    : getFacebookEmbedUrl(url);
}

/** Normalizes an external URL according to its selected provider. */
export function normalizeExternalVideoUrl(
  videoType: ExternalVideoType,
  url: string | null | undefined,
): string | null {
  return videoType === "youtube"
    ? normalizeYouTubeVideoUrl(url)
    : normalizeFacebookVideoUrl(url);
}
