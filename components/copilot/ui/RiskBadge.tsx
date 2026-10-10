import type { RiskLevel } from "@/types/copilot";

const STYLES: Record<RiskLevel, { icon: string; dot: string; label: string }> = {
  low: { icon: "✓", dot: "bg-sc-good", label: "Low" },
  medium: { icon: "!", dot: "bg-sc-warning", label: "Medium" },
  high: { icon: "▲", dot: "bg-sc-critical", label: "High" },
};

type RiskBadgeProps = { label: string; level: RiskLevel };

/** Status is never color alone: icon + level text ride with the colored dot. */
export function RiskBadge({ label, level }: RiskBadgeProps) {
  const style = STYLES[level];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sc-line bg-sc-surface-muted px-2.5 py-1 text-xs font-medium">
      <span aria-hidden className={`inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${style.dot}`}>
        {style.icon}
      </span>
      <span>
        {label}: {style.label}
      </span>
    </span>
  );
}
