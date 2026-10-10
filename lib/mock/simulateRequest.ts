const MIN_LATENCY_MS = 300;
const LATENCY_JITTER_MS = 400;

export type MockScenario = "default" | "empty" | "error";

/** Dev helper: add `?mock=empty` or `?mock=error` to the URL to preview those states. */
export function readMockScenario(): MockScenario {
  if (typeof window === "undefined") return "default";
  const value = new URLSearchParams(window.location.search).get("mock");
  return value === "empty" || value === "error" ? value : "default";
}

/** Resolves mock data after a short, realistic delay. */
export async function simulateRequest<T>(produce: () => T): Promise<T> {
  await new Promise((resolve) =>
    setTimeout(resolve, MIN_LATENCY_MS + Math.random() * LATENCY_JITTER_MS),
  );
  if (readMockScenario() === "error") {
    throw new Error("Simulated network error. Remove ?mock=error from the URL to load data.");
  }
  return produce();
}
