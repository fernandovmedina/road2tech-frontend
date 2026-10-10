"use client";

import { useStores } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import type { DataMode, RangeKey } from "@/types";

const D = copy.dashboard;
const RANGES = Object.keys(D.ranges) as RangeKey[];
const MODES: { value: DataMode; label: string }[] = [
  { value: "actual", label: D.current },
  { value: "forecast", label: D.forecast },
];

export function DashboardControls() {
  const { branchId, mode, range, setBranch, setMode, setRange } = useFilters();
  const stores = useStores().data ?? [];

  return (
    <>
      <Select id="branch-select" label={copy.common.branch} value={branchId} onChange={(e) => setBranch(e.target.value)} className="min-w-52">
        <option value="all">{copy.common.allBranches}</option>
        {stores.map((s) => (
          <option key={s.store_id} value={s.store_id}>{displayBranchName(s)}</option>
        ))}
      </Select>
      <SegmentedControl label={D.dataMode} options={MODES} value={mode} onChange={setMode} />
      <Select id="range-select" label={D.range} value={range} onChange={(e) => setRange(e.target.value as RangeKey)}>
        {RANGES.map((k) => (
          <option key={k} value={k}>{D.ranges[k]}</option>
        ))}
      </Select>
    </>
  );
}
