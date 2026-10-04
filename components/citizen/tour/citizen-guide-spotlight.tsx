import { useId } from "react";
import type { TourRect } from "@/lib/tours/position";
import styles from "@/components/admin/tour/live-tutorial.module.css";

export function CitizenGuideSpotlight({ rects }: { rects: TourRect[] }) {
  const maskId = useId();
  if (rects.length === 0) return null;
  return <>
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" style={{ maskType: "luminance" }}>
          <rect width="100%" height="100%" fill="white" />
          {rects.map((rect, index) => <rect key={index} x={rect.left} y={rect.top} width={rect.width} height={rect.height} rx="6" fill="black" />)}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgb(15 23 42 / 48%)" mask={`url(#${maskId})`} />
    </svg>
    {rects.map((rect, index) => <div key={index} aria-hidden="true" className={styles.spotlight} style={{ ...rect, boxShadow: "none" }} />)}
  </>;
}
