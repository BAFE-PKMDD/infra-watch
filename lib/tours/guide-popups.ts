const popupSelector = '[role="listbox"], [data-slot="select-content"], [data-citizen-guide-options]';

/** Follow the active field's ARIA relationships across portals, never unrelated menus. */
export function guidePopups(scope: HTMLElement | null): HTMLElement[] {
  if (!scope) return [];
  const popups = new Set<HTMLElement>();
  const controls = [scope, ...scope.querySelectorAll<HTMLElement>("[aria-controls], [aria-owns]")];
  for (const control of controls) {
    if (control.getAttribute("aria-expanded") === "false") continue;
    const ids = `${control.getAttribute("aria-controls") ?? ""} ${control.getAttribute("aria-owns") ?? ""}`.trim().split(/\s+/);
    for (const id of ids) {
      if (!id) continue;
      const linked = scope.ownerDocument.getElementById(id);
      if (!linked?.matches(popupSelector)) continue;
      // Base UI links the inner list. Include the popup's padding and scroll arrows too.
      const popup = linked.closest<HTMLElement>('[data-slot="select-content"]') ?? linked;
      if (!popup.isConnected || !popup.getClientRects().length || popup.closest('[hidden], [aria-hidden="true"], [data-state="closed"], [data-closed]')) continue;
      if (scope.ownerDocument.defaultView?.getComputedStyle(popup).visibility === "hidden") continue;
      popups.add(popup);
    }
  }
  return [...popups];
}
