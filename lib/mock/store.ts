import type { DemoState, PromoSuggestion, RestockOrder } from "@/types";

// Mutable mock state persisted for the browser session. TODO(backend): replaced by real mutations.
const KEY = "stockcopilot.mock.v1";

export type SupplierPatch = {
  name?: string; email?: string; leadTimeDays?: number; deliveryDays?: string; minOrderValue?: number; fillRate?: number;
};

export type MockState = {
  promoStatus: Record<string, { status: PromoSuggestion["status"]; discountPct?: number }>;
  orders: RestockOrder[];
  supplierPatches: Record<string, SupplierPatch>;
  extraSuppliers: { id: string; name: string; email: string; leadTimeDays: number; deliveryDays: string; minOrderValue: number; fillRate: number }[];
  minMax: Record<string, { minStock: number; maxStock: number }>;
  demo: DemoState;
};

const empty = (): MockState => ({
  promoStatus: {},
  orders: [],
  supplierPatches: {},
  extraSuppliers: [],
  minMax: {},
  demo: "normal",
});

let state: MockState | null = null;

export function getState(): MockState {
  if (state) return state;
  state = empty();
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(KEY);
      if (raw) state = { ...empty(), ...(JSON.parse(raw) as Partial<MockState>) };
    } catch {
      /* ignore corrupt storage */
    }
  }
  return state;
}

export function mutate(fn: (s: MockState) => void) {
  const s = getState();
  fn(s);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }
}

export function resetState() {
  state = empty();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}
