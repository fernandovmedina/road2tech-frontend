import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { IMPORTANCE_LABELS } from "@/lib/opportunities/labels";
import type { EventImportance } from "@/types/demandEvent";

export function ImportanceBadge({ importance }: { importance: EventImportance }) {
  const isPlayoff = importance === "final" || importance === "semifinal";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        importance === "regular" ? "bg-ink/[0.06] text-ink-secondary" : "bg-ink text-white",
      )}
    >
      {isPlayoff && <Trophy className="size-3" aria-hidden />}
      {IMPORTANCE_LABELS[importance]}
    </span>
  );
}
