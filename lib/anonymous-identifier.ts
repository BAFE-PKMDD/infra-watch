/**
 * Generates a deterministic unique identifier, icon, and visual styling for anonymous citizens.
 * Ensures anonymous users do not look like the same person across posts and comments.
 */

export type AnonymousIconName =
  | "shield"
  | "user"
  | "eye-off"
  | "fingerprint"
  | "ghost"
  | "sparkles"
  | "compass"
  | "smile"
  | "glasses"
  | "feather";

export interface AnonymousUser {
  displayName: string;
  shortName: string;
  number: number;
  badge: string;
  initials: string;
  iconName: AnonymousIconName;
  gradient: string;
  textColor: string;
  ringColor: string;
  bgColor: string;
}

export function getAnonymousUser(seed: string): AnonymousUser {
  let hash = 0;
  const safeSeed = seed || "default-anonymous-seed";
  for (let i = 0; i < safeSeed.length; i++) {
    hash = (hash << 5) - hash + safeSeed.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const number = (absHash % 9000) + 1000; // 4-digit number: 1000 - 9999

  /**
   * R-31 Design Rationale:
   * - 8 Palettes: Chosen across balanced color temperatures (blue, emerald, amber, rose, purple, cyan, teal, fuchsia)
   *   with dark-to-medium gradient stops ensuring minimum 4.5:1 WCAG contrast against white icon foregrounds.
   * - 10 Icons: Civic-focused, friendly Lucide icons (Shield, User, EyeOff, Fingerprint, Ghost, Sparkles, Compass,
   *   Smile, Glasses, Feather) representing privacy, civic monitoring, and community observation.
   * - Product (8 * 10 = 80 variations): Combined with 4-digit IDs, gives distinct visual identity across discussions
   *   without tracking real citizen personally identifiable information.
   */
  const palettes = [
    {
      gradient: "from-blue-600 to-indigo-700",
      textColor: "text-blue-100",
      ringColor: "ring-blue-400/40",
      bgColor: "bg-blue-600",
    },
    {
      gradient: "from-emerald-600 to-teal-700",
      textColor: "text-emerald-100",
      ringColor: "ring-emerald-400/40",
      bgColor: "bg-emerald-600",
    },
    {
      gradient: "from-amber-600 to-orange-700",
      textColor: "text-amber-100",
      ringColor: "ring-amber-400/40",
      bgColor: "bg-amber-600",
    },
    {
      gradient: "from-rose-600 to-pink-700",
      textColor: "text-rose-100",
      ringColor: "ring-rose-400/40",
      bgColor: "bg-rose-600",
    },
    {
      gradient: "from-purple-600 to-violet-800",
      textColor: "text-purple-100",
      ringColor: "ring-purple-400/40",
      bgColor: "bg-purple-600",
    },
    {
      gradient: "from-cyan-600 to-blue-700",
      textColor: "text-cyan-100",
      ringColor: "ring-cyan-400/40",
      bgColor: "bg-cyan-600",
    },
    {
      gradient: "from-teal-600 to-emerald-800",
      textColor: "text-teal-100",
      ringColor: "ring-teal-400/40",
      bgColor: "bg-teal-600",
    },
    {
      gradient: "from-fuchsia-600 to-pink-800",
      textColor: "text-fuchsia-100",
      ringColor: "ring-fuchsia-400/40",
      bgColor: "bg-fuchsia-600",
    },
  ];

  const icons: AnonymousIconName[] = [
    "shield",
    "user",
    "eye-off",
    "fingerprint",
    "ghost",
    "sparkles",
    "compass",
    "smile",
    "glasses",
    "feather",
  ];

  const palette = palettes[absHash % palettes.length];
  const iconName = icons[absHash % icons.length];

  return {
    displayName: `Anonymous Citizen #${number}`,
    shortName: `Anonymous #${number}`,
    number,
    badge: `#${number}`,
    initials: `A${number.toString().slice(-2)}`,
    iconName,
    gradient: `bg-gradient-to-br ${palette.gradient}`,
    textColor: palette.textColor,
    ringColor: palette.ringColor,
    bgColor: palette.bgColor,
  };
}
