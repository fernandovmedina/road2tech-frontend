// Runtime switch between the mock adapter and the real backend. Components never read this directly.
//   NEXT_PUBLIC_API_MODE = "mock" (default) | "hybrid" | "http"
//     mock   → everything answers from lib/mock
//     hybrid → endpoints listed in liveRoutes.ts go to the real API, the rest still answer from lib/mock
//     http   → everything goes to the real API
//   NEXT_PUBLIC_API_URL  = base URL of the API (required when anything goes to the backend)
//   NEXT_PUBLIC_API_HTTP_PATHS = optional, "mock" and "hybrid": comma-separated path prefixes forced to the real backend on
//                                top of the mode, e.g. "/chat" to try the real assistant while the rest stays on sample data.
//   NEXT_PUBLIC_CHAT_ANALYSIS_SOURCE = "compat" (default) | "backend" once Lambda accepts chain/inventory analysis.

export type ApiMode = "mock" | "hybrid" | "http";

const rawMode = process.env.NEXT_PUBLIC_API_MODE;
export const apiMode: ApiMode = rawMode === "http" || rawMode === "hybrid" ? rawMode : "mock";
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
/** The mode is "mock": only the prefixes forced with NEXT_PUBLIC_API_HTTP_PATHS (if any) reach the backend. */
export const isMockMode = apiMode === "mock";
/** At least part of the data is simulated: shows the "Datos de ejemplo" badge and the demo controls. */
export const usesMockData = apiMode !== "http";
export const chatAnalysisSource = process.env.NEXT_PUBLIC_CHAT_ANALYSIS_SOURCE === "backend" ? "backend" : "compat";

const listedPaths = (process.env.NEXT_PUBLIC_API_HTTP_PATHS ?? "")
  .split(",")
  .map((p) => p.trim().replace(/\/$/, ""))
  .filter(Boolean);
// The backend needs its own token: as soon as any path is forced there, the login goes there too.
const forcedPaths = listedPaths.length > 0 ? [...new Set(["/auth", ...listedPaths])] : [];

/** True when `path` is forced to the real backend by NEXT_PUBLIC_API_HTTP_PATHS, whatever the mode. */
export function isForcedLivePath(path: string): boolean {
  return forcedPaths.some((p) => path === p || path.startsWith(`${p}/`));
}
