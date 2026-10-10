import { t } from "@/lib/labels";
import type { RiskLevel } from "@/types/copilot";

const STYLES: Record<RiskLevel, { icon: string; dot: string }> = {
  low: { icon: "✓", dot: "bg-primary" },
  medium: { icon: "!", dot: "bg-warning" },
  high: { icon: "▲", dot: "bg-alert" },
};

type RiskBadgeProps = { label: string; level: RiskLevel };

/** Status is never color alone: icon + level text ride with the colored dot. */
export function RiskBadge({ label, level }: RiskBadgeProps) {
  const style = STYLES[level];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-2.5 py-1 text-xs font-medium">
      <span aria-hidden className={`inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${style.dot}`}>
        {style.icon}
      </span>
      <span>
        {label}: {t("agentRiskLevel", level)}
      </span>
    </span>
  );
}
