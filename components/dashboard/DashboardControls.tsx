"use client";

import { useFilters } from "@/lib/filters";
import { copy } from "@/lib/copy";
import { BranchSelect } from "@/components/layout/BranchSelect";
import { Select } from "@/components/ui/Select";
import type { RangeKey } from "@/types";

const D = copy.dashboard;

export function DashboardControls() {
  const { mode, range, setMode, setRange } = useFilters();
  return (
    <>
      <BranchSelect />
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
        {(Object.keys(D.ranges) as RangeKey[]).map((k) => (
          <option key={k} value={k}>{D.ranges[k]}</option>
        ))}
      </Select>
    </>
  );
}
