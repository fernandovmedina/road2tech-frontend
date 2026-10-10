import { copy } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import type { StockStatus } from "@/types";
import { statusBar } from "./statusStyles";

const S = copy.stock;

/** Existence bar with markers for the minimum (reorder point) and the maximum, both given by the backend. */
export function StockLevelBar({ quantity, min, max, status }: { quantity: number; min: number; max: number; status: StockStatus }) {
  const scaleMax = Math.max(max * 1.25, quantity, 1); // drawing scale only
  const pos = (v: number) => `${Math.min(100, Math.max(0, (v / scaleMax) * 100))}%`;

  return (
    <div>
      <div
        className="relative h-2.5 rounded-full bg-[#EEF1F0]"
        role="img"
        aria-label={S.levelLabel(formatNumber(quantity), formatNumber(min), formatNumber(max))}
      >
        <div className={`h-full rounded-full ${statusBar[status]}`} style={{ width: pos(quantity) }} />
        <span aria-hidden className="absolute -top-1 h-[18px] w-0.5 bg-foreground/70" style={{ left: pos(min) }} />
        <span aria-hidden className="absolute -top-1 h-[18px] w-0.5 bg-foreground/70" style={{ left: pos(max) }} />
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {S.min} {formatNumber(min)} · {S.max} {formatNumber(max)}
      </p>
    </div>
  );
}
