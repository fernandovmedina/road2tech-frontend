"use client";

import { useStores } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { Select } from "@/components/ui/Select";
import type { RangeKey } from "@/types";

const D = copy.dashboard;
const RANGES = Object.keys(D.ranges) as RangeKey[];

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
      <div className="flex flex-col gap-1">
        <span id="mode-label" className="text-xs font-semibold text-muted">{D.dataMode}</span>
        <div role="group" aria-labelledby="mode-label" className="flex rounded-[10px] border border-line bg-white p-1">
          {(["actual", "forecast"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${mode === m ? (m === "forecast" ? "bg-accent text-white" : "bg-primary text-white") : "text-muted hover:text-foreground"}`}
            >
              {m === "actual" ? D.current : D.forecast}
            </button>
          ))}
        </div>
      </div>
      <Select id="range-select" label={D.range} value={range} onChange={(e) => setRange(e.target.value as RangeKey)}>
        {RANGES.map((k) => (
          <option key={k} value={k}>{D.ranges[k]}</option>
        ))}
      </Select>
    </>
  );
}
