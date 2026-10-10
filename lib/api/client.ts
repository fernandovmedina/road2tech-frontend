import { getState, mutate } from "@/lib/mock/store";
import type { DemoState } from "@/types";

// Mock transport: simulated latency + forced empty/error demo states.
// TODO(backend): replace `mockCall` with real fetch calls per resource.

export class ApiError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockCall<T>(fn: () => T, opts: { emptyValue?: T } = {}): Promise<T> {
  await sleep(300 + Math.random() * 300);
  const demo = getState().demo;
  if (demo === "error") throw new ApiError("Mock error");
  if (demo === "empty" && opts.emptyValue !== undefined) return opts.emptyValue;
  return fn();
}

export const getDemoState = (): DemoState => getState().demo;
export function setDemoState(demo: DemoState) {
  mutate((s) => { s.demo = demo; });
}
