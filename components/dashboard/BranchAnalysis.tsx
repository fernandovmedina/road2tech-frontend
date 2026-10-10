"use client";

import { OpportunityMapScreen } from "@/components/opportunities/OpportunityMapScreen";
import type { Scope } from "@/lib/api/hooks";

/** Product and tag driven demand map, embedded in the dashboard analysis area. */
export function BranchAnalysis({ scope }: { scope: Scope }) {
  void scope;
  return (
    <section aria-labelledby="analysis-title">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Demand intelligence</p>
        <h2 id="analysis-title" className="mt-1 text-lg font-extrabold">Analyze demand and products by branch</h2>
        <p className="mt-1 text-sm text-muted">Filter by product, category or demand driver, then select a point to inspect its forecast and inventory risk.</p>
      </div>
      <OpportunityMapScreen embedded />
    </section>
  );
}
