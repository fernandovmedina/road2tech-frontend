import type { DemoState, StrategyStatus } from "@/types";

// Mutable state of the mock "backend", persisted for the browser session so actions survive reloads.
// Mock handlers read/write it; components never touch it directly.
const KEY = "stockcopilot.mock.v2";

export type MockState = {
  /** draft_id → status override (add-to-plan / approve / reject done in this session). */
  strategyStatus: Record<string, { status: StrategyStatus; approved_at?: string }>;
  /** Strategies created from the chat (drafts), keyed by draft_id, stored as plain JSON. */
  chatDrafts: Record<string, unknown>;
  /** suggestion_id → sent order (JSON of RestockOrder). */
  sentOrders: Record<string, unknown>;
  /** `${store_id}|${product_id}` → edited stock policy. */
  policies: Record<string, { reorder_point: number; max_stock: number; updated_at: string }>;
  /** store_id → plan generation (bumped by `strategies:generate`) and when it was generated. */
  planMeta: Record<string, { generation: number; generated_at: string }>;
  demo: DemoState;
};

const empty = (): MockState => ({ strategyStatus: {}, chatDrafts: {}, sentOrders: {}, policies: {}, planMeta: {}, demo: "normal" });

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
