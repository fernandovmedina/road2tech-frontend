import { Info } from "lucide-react";
import { copy } from "@/lib/copy";

// Shown in the chain view: plans, behaviors, the assistant and orders only exist per store.
export function ChainNotice() {
  return (
    <div role="status" className="flex items-start gap-3 rounded-block bg-info-tint p-4 text-info">
      <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-bold">{copy.dashboard.scope.chainTitle}</p>
        <p className="mt-1 text-sm leading-relaxed">{copy.dashboard.scope.chainText}</p>
      </div>
    </div>
  );
}
