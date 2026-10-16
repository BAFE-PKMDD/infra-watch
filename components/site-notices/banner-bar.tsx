import { X } from "lucide-react";

type BannerBarProps = {
  message: string;
  backgroundColor: string;
  textColor: string;
  /** Accessible name for the whole banner. */
  label: string;
  /** When both are given, the banner shows a dismiss button. */
  onDismiss?: () => void;
  dismissLabel?: string;
};

/** The banner itself. Shared by the public pages and the live preview in admin settings. */
export function BannerBar({ message, backgroundColor, textColor, label, onDismiss, dismissLabel }: BannerBarProps) {
  return (
    <div
      role="region"
      aria-label={label}
      style={{ backgroundColor, color: textColor }}
      className="relative flex min-h-11 items-center justify-center px-14 py-2 text-center text-sm font-medium leading-snug"
    >
      <p className="max-w-4xl wrap-break-word">{message}</p>
      {onDismiss && dismissLabel ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md hover:bg-black/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
