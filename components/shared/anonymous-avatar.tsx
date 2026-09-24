"use client";

import React from "react";
import {
  Shield,
  User,
  EyeOff,
  Fingerprint,
  Ghost,
  Sparkles,
  Compass,
  Smile,
  Glasses,
  Feather,
  type LucideIcon,
} from "lucide-react";
import {
  getAnonymousUser,
  type AnonymousIconName,
  type AnonymousUser,
} from "@/lib/anonymous-identifier";

const ICON_MAP: Record<AnonymousIconName, LucideIcon> = {
  shield: Shield,
  user: User,
  "eye-off": EyeOff,
  fingerprint: Fingerprint,
  ghost: Ghost,
  sparkles: Sparkles,
  compass: Compass,
  smile: Smile,
  glasses: Glasses,
  feather: Feather,
};

export function AnonymousIcon({
  name,
  className = "w-4 h-4",
}: {
  name: AnonymousIconName;
  className?: string;
}) {
  const IconComponent = ICON_MAP[name] || User;
  return <IconComponent className={`${className} stroke-[2.2]`} aria-hidden="true" />;
}

interface AnonymousAvatarProps {
  seed?: string;
  anon?: AnonymousUser;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showRing?: boolean;
}

export function AnonymousAvatar({
  seed,
  anon: providedAnon,
  size = "md",
  className = "",
  showRing = true,
}: AnonymousAvatarProps) {
  const anon = providedAnon || getAnonymousUser(seed || "anonymous");
  const sizeMap = {
    xs: { container: "w-6 h-6", icon: "w-3 h-3" },
    sm: { container: "w-7 h-7", icon: "w-3.5 h-3.5" },
    md: { container: "w-8 h-8", icon: "w-4 h-4" },
    lg: { container: "w-10 h-10", icon: "w-5 h-5" },
    xl: { container: "w-11 h-11", icon: "w-5.5 h-5.5" },
  };

  const { container, icon } = sizeMap[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-2xs ${
        anon.gradient
      } ${showRing ? `ring-2 ${anon.ringColor}` : ""} ${container} ${className}`}
      title={anon.displayName}
      aria-label={anon.displayName}
    >
      <AnonymousIcon name={anon.iconName} className={`${icon} text-white drop-shadow-xs`} />
    </div>
  );
}
