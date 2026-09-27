type LiveVideoSchedule = {
  isLive: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
};

type LiveVideoState = {
  isActive: boolean;
  isLive: boolean;
  videoType: "facebook_live" | "youtube" | "recorded";
};

const PHILIPPINE_TIME_ZONE = "Asia/Manila";
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatLiveVideoDateInput(date: Date | null | undefined) {
  if (!date || Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseLiveVideoDateInput(
  value: string,
  boundary: "start" | "end",
): Date | null {
  if (!DATE_INPUT_PATTERN.test(value)) return null;

  const time = boundary === "start" ? "00:00:00.000" : "23:59:59.999";
  const parsed = new Date(`${value}T${time}+08:00`);
  if (Number.isNaN(parsed.getTime()) || formatLiveVideoDateInput(parsed) !== value) return null;
  return parsed;
}

export function validateLiveVideoState(state: LiveVideoState) {
  if (!state.isLive) return;
  if (!state.isActive) {
    throw new Error("A currently live video must also be active.");
  }
  if (state.videoType === "recorded") {
    throw new Error("A recorded video cannot be marked currently live.");
  }
}

export function validateLiveVideoActivation(
  state: { isActive: boolean; expiresAt: Date | null; videoType: string },
  now = new Date(),
) {
  if (state.videoType !== "recorded" && state.isActive && state.expiresAt && state.expiresAt <= now) {
    throw new Error("This video has expired. Edit the video and extend or clear its expiry date before activating it.");
  }
}

export function validateLiveVideoSchedule(
  schedule: LiveVideoSchedule,
  now = new Date(),
) {
  if (!schedule.isLive) return;
  if (schedule.publishedAt && schedule.publishedAt > now) {
    throw new Error("A broadcast whose publication window has not started cannot be marked currently live.");
  }
  if (schedule.expiresAt && schedule.expiresAt <= now) {
    throw new Error("An expired broadcast cannot be marked currently live.");
  }
}
