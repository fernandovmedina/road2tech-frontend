"use client";

import { useState } from "react";
import type { Strategy } from "@/types";

type Live<T> = { base: T | null; current: T | null };

/**
 * Keeps the strategy a screen shows in step with the backend. `incoming` (from a query) always wins when it changes;
 * `update` applies the strategy returned by an action right away. The update is merged over the current value, so
 * extra fields the action response does not carry (like the discount curve of a detail) are kept.
 */
export function useLiveStrategy<T extends Strategy>(incoming: T | null): [T | null, (next: Strategy) => void] {
  const [state, setState] = useState<Live<T>>({ base: incoming, current: incoming });
  if (incoming && state.base !== incoming) setState({ base: incoming, current: incoming });
  return [state.current, (next) => setState((s) => (s.current ? { ...s, current: { ...s.current, ...next } } : s))];
}
