import { z } from "zod";
import type { Session } from "@/types";
import { goesToBackend } from "./config";
import { ApiError } from "./envelope";

// The mock keeps the demo account; the real backend is POST /auth/signin (see docs/backend-contract.md §3.18).
const DEMO_EMAIL = "demo@stockcopilot.com";
const DEMO_PASSWORD = "demo1234";
export const SESSION_KEY = "stockcopilot.session";

export class AuthError extends Error {}

const sessionSchema = z.object({
  token: z.string(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});

const SIGNIN_PATH = "/auth/signin";
const MOCK_TOKEN_PREFIX = "mock-token-";

export async function login(email: string, password: string): Promise<Session> {
  if (!goesToBackend(SIGNIN_PATH)) {
    await new Promise((r) => setTimeout(r, 600));
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      throw new AuthError("invalid_credentials");
    }
    return { token: `${MOCK_TOKEN_PREFIX}${Date.now()}`, user: { id: "u-demo", name: "Daniela Reyes", email: DEMO_EMAIL } };
  }

  // Imported lazily so the mock build never pulls the HTTP transport.
  const { httpRequest } = await import("./http");
  try {
    const res = await httpRequest(SIGNIN_PATH, sessionSchema, { method: "POST", body: { email: email.trim(), password } });
    return res.data;
  } catch (e) {
    // The transport treats 401 as an expired session; on the login form it means wrong credentials.
    if (e instanceof ApiError && (e.kind === "unauthorized" || e.code === "invalid_credentials")) throw new AuthError("invalid_credentials");
    throw e;
  }
}

export async function logout(): Promise<void> {
  // TODO(backend): revoke token (POST /auth/logout) once the endpoint exists.
}

export function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    // A sample-data session cannot call the real backend: ask for a real login instead of failing on the first call.
    if (session?.token.startsWith(MOCK_TOKEN_PREFIX) && goesToBackend(SIGNIN_PATH)) return null;
    return session;
  } catch {
    return null;
  }
}

export function storeSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}
