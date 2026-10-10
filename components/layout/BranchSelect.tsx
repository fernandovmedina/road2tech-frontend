"use client";

import { useMemo } from "react";
import { useStores } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { useFilters } from "@/lib/filters";
import { copy } from "@/lib/copy";
import { Select } from "@/components/ui/Select";

/**
 * Store selector shared by every screen. Reads/writes the global `branchId` filter.
 * With `includeAll={false}` (screens that need one store) a placeholder is shown while the filter is still "all".
 */
export function BranchSelect({
  id = "branch-select",
  includeAll = true,
  label = copy.common.branch,
  onPicked,
}: {
  id?: string;
  includeAll?: boolean;
  /** Distinct label when a second selector shares the screen with the main one. */
  label?: string;
  onPicked?: (storeId: string) => void;
}) {
  const { data: stores } = useStores();
  const { branchId, setBranch } = useFilters();

  const options = useMemo(
    () =>
      (stores ?? [])
        .map((s) => ({ id: s.store_id, name: displayBranchName(s) }))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [stores],
  );

  const needsChoice = !includeAll && branchId === "all";

  return (
    <Select
      id={id}
      label={label}
      value={needsChoice ? "" : branchId}
      onChange={(e) => {
        if (!e.target.value) return;
        setBranch(e.target.value);
        onPicked?.(e.target.value);
      }}
      className="min-w-56"
    >
      {includeAll && <option value="all">{copy.common.allBranches}</option>}
      {needsChoice && (
        <option value="" disabled>
          {copy.common.chooseBranch}
        </option>
      )}
      {options.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </Select>
  );
}

/** Store id used by data queries: a store id or "all". */
export function useEffectiveBranch(): string | "all" {
  return useFilters((s) => s.branchId);
}
