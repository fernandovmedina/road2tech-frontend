import { copy } from "@/lib/copy";
import { isMockMode } from "@/lib/api/config";

/** Shown only while the app answers from the mock adapter; hidden when talking to the real backend. */
export function SampleDataBadge() {
  if (!isMockMode) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-tint px-3 py-1 text-xs font-bold text-accent-dark">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
      {copy.common.sampleData}
    </span>
  );
}
