/** Track rendered positions, including compositor transforms that do not fire resize events. */
export function trackTourLayout(measure: () => void, view: Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame"> = window, page: Pick<Document, "hidden" | "addEventListener" | "removeEventListener"> = document) {
  let frame: number | null = null;
  let stopped = false;
  const schedule = () => {
    if (!stopped && !page.hidden && frame === null) frame = view.requestAnimationFrame(tick);
  };
  const tick = () => {
    frame = null;
    if (stopped || page.hidden) return;
    measure();
    schedule();
  };
  const visibility = () => {
    if (page.hidden && frame !== null) { view.cancelAnimationFrame(frame); frame = null; }
    else schedule();
  };
  page.addEventListener("visibilitychange", visibility);
  schedule();
  return () => {
    stopped = true;
    if (frame !== null) view.cancelAnimationFrame(frame);
    page.removeEventListener("visibilitychange", visibility);
  };
}
