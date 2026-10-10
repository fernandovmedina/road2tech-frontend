"use client";

import { useBranches } from "@/lib/api/hooks";
import { useFilters } from "@/lib/filters";
import { copy } from "@/lib/copy";
import { Select } from "@/components/ui/Select";

export function BranchSelect({ id = "branch-select" }: { id?: string }) {
  const { data: branches = [] } = useBranches();
  const { branchId, setBranch } = useFilters();

  return (
    <Select id={id} label={copy.common.branch} value={branchId} onChange={(e) => setBranch(e.target.value)} className="min-w-48">
      <option value="all">{copy.common.allBranches}</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </Select>
  );
}

// Branch id used by data queries.
export function useEffectiveBranch(): string | "all" {
  return useFilters((s) => s.branchId);
}
