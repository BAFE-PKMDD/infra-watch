export type GuideControlAction = { label: string; behavior: "activate" | "focus" };

const fields = 'input:not([type="hidden"]), textarea, select';
const controls = `${fields}, button, a[href], summary, [role="combobox"]`;
const canUse = (element: HTMLElement) => element.isConnected
  && element.getClientRects().length > 0
  && !element.matches(':disabled, [aria-disabled="true"]')
  && !element.closest('[inert], [hidden], [aria-hidden="true"]');

export function guideControl(target: HTMLElement | null, action: GuideControlAction): HTMLElement | null {
  if (!target || !canUse(target)) return null;
  // Only explicitly targeted buttons and links can be activated. Never choose
  // an arbitrary submit button, checkbox, or option from a highlighted form.
  if (action.behavior === "activate") return target.matches('button, a[href], summary') ? target : null;
  if (target.matches(controls)) return target;
  return Array.from(target.querySelectorAll<HTMLElement>(fields)).find(canUse)
    ?? Array.from(target.querySelectorAll<HTMLElement>(controls)).find(canUse)
    ?? null;
}

export function performGuideControlAction(target: HTMLElement | null, action: GuideControlAction): boolean {
  const control = guideControl(target, action);
  if (!control) return false;
  control.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
  control.focus({ preventScroll: true });
  if (action.behavior === "activate") control.click();
  return true;
}
