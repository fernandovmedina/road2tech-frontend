import { copy } from "@/lib/copy";
import { usesMockData } from "@/lib/api/config";

/** Shown while any part of the data comes from the mock adapter; hidden when everything is real (mode http). */
export function SampleDataBadge() {
  if (!usesMockData) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-tint px-3 py-1 text-xs font-bold text-accent-dark">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
      {copy.common.sampleData}
    </span>
  );
}
