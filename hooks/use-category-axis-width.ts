"use client";

import useMediaQuery from "@/hooks/use-media-query";

// Horizontal bar charts reserve a fixed-width column for their category labels. On a phone
// that column can take half the card, leaving almost no room for the bars, so narrow it.
export function useCategoryAxisWidth(desktopWidth: number, phoneWidth = 104) {
  const isPhone = useMediaQuery("(max-width: 639px)");
  return isPhone ? Math.min(desktopWidth, phoneWidth) : desktopWidth;
}
