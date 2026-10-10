import { z } from "zod";
import type { Session } from "@/types";
import { isMockMode } from "./config";
import { ApiError } from "./envelope";

// Mock mode keeps the demo account; hybrid and http modes call POST /auth/signin (see docs/backend-contract.md).
const DEMO_EMAIL = "demo@stockcopilot.com";
const DEMO_PASSWORD = "demo1234";
export const SESSION_KEY = "stockcopilot.session";

export class AuthError extends Error {}

const sessionSchema = z.object({
  token: z.string(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});

export async function login(email: string, password: string): Promise<Session> {
  if (isMockMode) {
    await new Promise((r) => setTimeout(r, 600));
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      throw new AuthError("invalid_credentials");
    }
    return { token: `mock-token-${Date.now()}`, user: { id: "u-demo", name: "Daniela Reyes", email: DEMO_EMAIL } };
  }

  // Imported lazily so the mock build never pulls the HTTP transport.
  const { httpRequest } = await import("./http");
  try {
    const res = await httpRequest("/auth/signin", sessionSchema, { method: "POST", body: { email: email.trim(), password } });
    return res.data;
  } catch (e) {
    // The transport treats 401 as an expired session; on the login form it means wrong credentials.
    if (e instanceof ApiError && (e.kind === "unauthorized" || e.code === "invalid_credentials")) throw new AuthError("invalid_credentials");
    throw e;
  }
}

const logoutSchema = z.object({ logged_out: z.boolean() });

/** Revokes the token on the backend. Best effort: the local session is cleared by the caller either way. */
export async function logout(): Promise<void> {
  if (isMockMode) return;
  try {
    const { httpRequest } = await import("./http");
    await httpRequest("/auth/logout", logoutSchema, { method: "POST" });
  } catch {
    /* expired or unreachable: nothing left to revoke */
  }
}

export function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
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
