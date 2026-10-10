import type { z } from "zod";
import { apiBaseUrl } from "./config";
import { ApiError, envelope, errorBody, type Envelope } from "./envelope";
import { SESSION_KEY } from "./auth";

// Real transport: bearer token on every call, envelope + schema validation, 401 → session cleared.

type Query = Record<string, string | number | boolean | null | undefined>;
type Options = { method?: "GET" | "POST" | "PUT" | "DELETE"; query?: Query; body?: unknown; signal?: AbortSignal };

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

function readToken(): string | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? ((JSON.parse(raw) as { token?: string }).token ?? null) : null;
  } catch {
    return null;
  }
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${apiBaseUrl}${path}`, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return apiBaseUrl ? url.toString() : `${url.pathname}${url.search}`;
}

export async function httpRequest<T extends z.ZodType>(
  path: string,
  schema: T,
  opts: Options = {},
): Promise<Envelope<z.infer<T>>> {
  const token = readToken();
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch {
    throw new ApiError("network", "No se pudo conectar con el servidor");
  }

  if (res.status === 401) {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage unavailable */
    }
    unauthorizedHandler?.(); // AuthProvider clears its state; the route guard then redirects to /login
    throw new ApiError("unauthorized", "Sesión vencida");
  }

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = errorBody.safeParse(json);
    throw new ApiError(
      "server",
      parsed.success ? parsed.data.message : "Error del servidor",
      parsed.success ? parsed.data.request_id : undefined,
      parsed.success ? parsed.data.code : undefined,
    );
  }

  const parsed = envelope(schema).safeParse(json);
  if (!parsed.success) {
    const rid = typeof (json as { request_id?: unknown } | null)?.request_id === "string" ? (json as { request_id: string }).request_id : undefined;
    console.error("Invalid API response", path, rid, parsed.error.issues);
    throw new ApiError("invalid_response", "La respuesta del servidor no tiene el formato esperado", rid);
  }
  return parsed.data as Envelope<z.infer<T>>;
}
