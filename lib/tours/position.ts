export type TourRect = { top: number; left: number; width: number; height: number };

export function tourRectUnion(rects: Array<TourRect | null>): TourRect | null {
  const visible = rects.filter((rect): rect is TourRect => Boolean(rect && rect.width > 0 && rect.height > 0));
  if (!visible.length) return null;
  const left = Math.min(...visible.map((rect) => rect.left));
  const top = Math.min(...visible.map((rect) => rect.top));
  return {
    left, top,
    width: Math.max(...visible.map((rect) => rect.left + rect.width)) - left,
    height: Math.max(...visible.map((rect) => rect.top + rect.height)) - top,
  };
}

export function tourPanelPosition(target: TourRect | null, viewport: { width: number; height: number }, panel: { width: number; height: number }) {
  const gap = 16;
  const width = Math.min(panel.width, viewport.width - gap * 2);
  const height = Math.min(panel.height, viewport.height - gap * 2);
  const clampX = (x: number) => Math.max(gap, Math.min(x, viewport.width - width - gap));
  const clampY = (y: number) => Math.max(gap, Math.min(y, viewport.height - height - gap));
  if (!target) return { left: clampX((viewport.width - width) / 2), top: clampY((viewport.height - height) / 2) };
  const right = target.left + target.width;
  const bottom = target.top + target.height;
  if (right + width + gap * 2 <= viewport.width) return { left: right + gap, top: clampY(target.top) };
  if (target.left - width - gap >= gap) return { left: target.left - width - gap, top: clampY(target.top) };
  if (bottom + height + gap * 2 <= viewport.height) return { left: clampX(target.left), top: bottom + gap };
  if (target.top - height - gap >= gap) return { left: clampX(target.left), top: clampY(target.top - height - gap) };
  return { left: clampX((viewport.width - width) / 2), top: clampY(viewport.height - height - gap) };
}
