// Runtime switch between the mock adapter and the real backend. Components never read this directly.
//   NEXT_PUBLIC_API_MODE       = "mock" (default) | "http"
//   NEXT_PUBLIC_API_URL        = base URL of the API (required when anything goes to the backend)
//   NEXT_PUBLIC_API_HTTP_PATHS = mock mode only, optional: comma-separated path prefixes answered by the real backend
//                                while the rest stays on sample data, e.g. "/auth,/chat" to try the real assistant.
//   NEXT_PUBLIC_CHAT_ANALYSIS_SOURCE = "compat" (default) | "backend" once Lambda accepts chain/inventory analysis.

export type ApiMode = "mock" | "http";

export const apiMode: ApiMode = process.env.NEXT_PUBLIC_API_MODE === "http" ? "http" : "mock";
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const isMockMode = apiMode === "mock";
export const chatAnalysisSource = process.env.NEXT_PUBLIC_CHAT_ANALYSIS_SOURCE === "backend" ? "backend" : "compat";

const listedPaths = (process.env.NEXT_PUBLIC_API_HTTP_PATHS ?? "")
  .split(",")
  .map((p) => p.trim().replace(/\/$/, ""))
  .filter(Boolean);
// The backend needs its own token: as soon as any path goes there, the login goes there too.
const httpPaths = listedPaths.length > 0 ? [...new Set(["/auth", ...listedPaths])] : [];

/** True when `path` is answered by the real backend: always in http mode, only the listed prefixes in mock mode. */
export function goesToBackend(path: string): boolean {
  return !isMockMode || httpPaths.some((p) => path === p || path.startsWith(`${p}/`));
}
