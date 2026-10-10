import { copy } from "@/lib/copy";

// Shown in the chain view: plans, behaviors, the assistant and orders only exist per store.
export function ChainNotice() {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-info/25 bg-info-tint p-4 text-info">
      <span aria-hidden className="mt-0.5 text-lg leading-none">ⓘ</span>
      <div>
        <p className="text-sm font-extrabold">{copy.dashboard.scope.chainTitle}</p>
        <p className="mt-1 text-sm leading-relaxed">{copy.dashboard.scope.chainText}</p>
      </div>
    </div>
  );
}
