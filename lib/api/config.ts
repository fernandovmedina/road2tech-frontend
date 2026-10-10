// Runtime switch between the mock adapter and the real backend. Components never read this directly.
//   NEXT_PUBLIC_API_MODE = "mock" (default) | "hybrid" | "http"
//     mock   → everything answers from lib/mock
//     hybrid → endpoints listed in liveRoutes.ts go to the real API, the rest still answer from lib/mock
//     http   → everything goes to the real API
//   NEXT_PUBLIC_API_URL  = base URL of the API (required when mode is "hybrid" or "http")

export type ApiMode = "mock" | "hybrid" | "http";

const rawMode = process.env.NEXT_PUBLIC_API_MODE;
export const apiMode: ApiMode = rawMode === "http" || rawMode === "hybrid" ? rawMode : "mock";
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
/** Nothing talks to the backend (login included). */
export const isMockMode = apiMode === "mock";
/** At least part of the data is simulated: shows the "Datos de ejemplo" badge and the demo controls. */
export const usesMockData = apiMode !== "http";
