export type HeaderOverlay = "user" | "notifications" | null;

type OpenHeaderOverlay = Exclude<HeaderOverlay, null>;

export function setHeaderOverlay(
  _current: HeaderOverlay,
  target: OpenHeaderOverlay,
  open: boolean,
): HeaderOverlay {
  return open ? target : null;
}

export function toggleHeaderOverlay(
  current: HeaderOverlay,
  target: OpenHeaderOverlay,
): HeaderOverlay {
  return current === target ? null : target;
}
