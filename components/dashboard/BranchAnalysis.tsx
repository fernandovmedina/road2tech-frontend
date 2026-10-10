"use client";

import { OpportunityMapScreen } from "@/components/opportunities/OpportunityMapScreen";
import type { Scope } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";

/** Product and tag driven demand map, embedded in the dashboard analysis area. */
export function BranchAnalysis({ scope }: { scope: Scope }) {
  const setBranch = useFilters((s) => s.setBranch);
  return (
    <section aria-labelledby="analysis-title">
      <div className="mb-3">
        <h2 id="analysis-title" className="text-lg font-bold">{copy.dashboard.analysis.title}</h2>
      </div>
      <OpportunityMapScreen
        embedded
        branchId={scope.branchId === "all" ? undefined : scope.branchId}
        onBranchChange={setBranch}
      />
    </section>
  );
}
