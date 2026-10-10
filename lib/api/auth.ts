import type { Session } from "@/types";

// TODO(backend): real auth endpoint returning a signed token.
const DEMO_EMAIL = "demo@stockcopilot.com";
const DEMO_PASSWORD = "demo1234";
export const SESSION_KEY = "stockcopilot.session";

export class AuthError extends Error {}

export async function login(email: string, password: string): Promise<Session> {
  await new Promise((r) => setTimeout(r, 600));
  if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    throw new AuthError("invalid_credentials");
  }
  const session: Session = {
    token: `mock-token-${Date.now()}`,
    user: { id: "u-demo", name: "Daniela Reyes", email: DEMO_EMAIL },
  };
  return session;
}

export async function logout(): Promise<void> {
  // TODO(backend): revoke token
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
