export function MapLayerLegend({
  shape,
  color,
}: {
  shape: string;
  color: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill={color}
      stroke="currentColor"
      strokeWidth="1"
    >
      {shape === "line" ? (
        <path d="M2 12h20" stroke={color} strokeWidth="4" />
      ) : shape === "triangle" ? (
        <path d="m12 3 10 18H2Z" />
      ) : shape === "diamond" ? (
        <path d="m12 2 10 10-10 10L2 12Z" />
      ) : shape === "polygon" ? (
        <path d="m6 3 14 3 2 12-12 4L2 13Z" />
      ) : shape === "square" ? (
        <rect x="4" y="4" width="16" height="16" />
      ) : (
        <circle cx="12" cy="12" r="8" />
      )}
    </svg>
  );
}
