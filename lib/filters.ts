"use client";

import { create } from "zustand";
import type { DataMode, RangeKey } from "@/types";

// Shared filters kept across screens (UI state only, not server data).
type FiltersState = {
  branchId: string | "all";
  mode: DataMode;
  range: RangeKey;
  setBranch: (b: string | "all") => void;
  setMode: (m: DataMode) => void;
  setRange: (r: RangeKey) => void;
};

export const useFilters = create<FiltersState>((set) => ({
  branchId: "all",
  mode: "actual",
  range: "last30",
  setBranch: (branchId) => set({ branchId }),
  setMode: (mode) =>
    set((s) => ({
      mode,
      range: mode === "forecast" && s.range.startsWith("last") ? "next14" : mode === "actual" && s.range.startsWith("next") ? "last30" : s.range,
    })),
  setRange: (range) => set({ range }),
}));
