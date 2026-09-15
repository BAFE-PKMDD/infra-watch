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

export function validateLiveVideoState(state: LiveVideoState) {
  if (!state.isLive) return;
  if (!state.isActive) {
    throw new Error("A currently live video must also be active.");
  }
  if (state.videoType === "recorded") {
    throw new Error("A recorded video cannot be marked currently live.");
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
