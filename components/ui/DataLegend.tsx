import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export type DataLegendShape = "dot" | "line" | "dashed" | "band";

export type DataLegendItem = {
  /** CSS variable token, e.g. `var(--color-primary)` (never a hex literal). */
  color: string;
  label: string;
  shape: DataLegendShape;
};

/** Chart/map legend. Colors come from the canonical CSS variable tokens, matching the chart itself. */
export function DataLegend({
  items,
  label,
  className = "",
}: {
  items: readonly DataLegendItem[];
  /** Accessible name for the list (Spanish, from `lib/copy.ts`). */
  label: string;
  className?: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted", className)}
    >
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          <Swatch color={item.color} shape={item.shape} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Swatch({ color, shape }: { color: string; shape: DataLegendShape }) {
  const style: CSSProperties =
    shape === "dashed" ? { borderColor: color } : { backgroundColor: color };
  const classes =
    shape === "dot"
      ? "size-2.5 shrink-0 rounded-full"
      : shape === "line"
        ? "h-0.5 w-4 shrink-0 rounded-full"
        : shape === "dashed"
          ? "w-4 shrink-0 border-t-2 border-dashed"
          : "h-2.5 w-4 shrink-0 rounded-sm opacity-25";
  return <span aria-hidden className={classes} style={style} />;
}
