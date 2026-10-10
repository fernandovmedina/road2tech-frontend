import type { z } from "zod";
import { getState, mutate, resetState } from "@/lib/mock/store";
import type { DemoState } from "@/types";
import { goesToBackend } from "./config";
import { ApiError, envelope, type Envelope } from "./envelope";

// Single entry point for every API call. Components never call this directly: they use hooks (hooks.ts).
// Mock mode answers from lib/mock handlers; http mode calls the backend. Both are validated with the same schema.

export { ApiError };

export type Query = Record<string, string | number | boolean | null | undefined>;
export type RequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; query?: Query; body?: unknown };

const MOCK_AS_OF = "2026-09-30"; // fallback only; the mock meta handler returns the real data_as_of

export async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  opts: RequestOptions = {},
): Promise<Envelope<z.infer<T>>> {
  if (goesToBackend(path)) {
    const { httpRequest } = await import("./http");
    return httpRequest(path, schema, opts);
  }
  const { mockDispatch, MockHttpError } = await import("@/lib/mock/router");
  const query = Object.fromEntries(
    Object.entries(opts.query ?? {})
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );
  let data: unknown;
  try {
    data = await mockDispatch(opts.method ?? "GET", path, query, opts.body);
  } catch (e) {
    if (e instanceof MockHttpError) throw new ApiError("server", e.message, "mock-request", e.code);
    throw e;
  }
  const { loadMeta } = await import("@/lib/mock/db");
  const asOf = (await loadMeta()).data_as_of ?? MOCK_AS_OF;
  const parsed = envelope(schema).safeParse({ request_id: `mock-${Date.now()}`, data_as_of: asOf, data });
  if (!parsed.success) {
    console.error("Mock response does not match the API schema", path, parsed.error.issues);
    throw new ApiError("invalid_response", "La respuesta de ejemplo no coincide con el contrato", "mock-request");
  }
  return parsed.data as Envelope<z.infer<T>>;
}

export const getDemoState = (): DemoState => getState().demo;
export function setDemoState(demo: DemoState) {
  mutate((s) => {
    s.demo = demo;
  });
}
/** Drops every mock mutation (policies, orders, strategy statuses) and the demo state. Mock mode only. */
export function resetDemoData() {
  resetState();
}
