// Runtime switch between the mock adapter and the real backend. Components never read this directly.
//   NEXT_PUBLIC_API_MODE = "mock" (default) | "http"
//   NEXT_PUBLIC_API_URL  = base URL of the API (required when mode is "http")

export type ApiMode = "mock" | "http";

export const apiMode: ApiMode = process.env.NEXT_PUBLIC_API_MODE === "http" ? "http" : "mock";
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const isMockMode = apiMode === "mock";
