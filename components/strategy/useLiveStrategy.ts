"use client";

import { useState } from "react";
import type { Strategy } from "@/types";

type Live = { base: Strategy | null; current: Strategy | null };

/**
 * Keeps the strategy a screen shows in step with the backend. `incoming` (from the plan query) always wins when it
 * changes; `update` applies the strategy returned by an action right away, and it stays on screen even if the plan
 * no longer lists it (for example a rejected strategy leaves the plan).
 */
export function useLiveStrategy(incoming: Strategy | null): [Strategy | null, (next: Strategy) => void] {
  const [state, setState] = useState<Live>({ base: incoming, current: incoming });
  if (incoming && state.base !== incoming) setState({ base: incoming, current: incoming });
  return [state.current, (next) => setState((s) => ({ ...s, current: next }))];
}
