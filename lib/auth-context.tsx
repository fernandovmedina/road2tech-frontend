"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { login as apiLogin, logout as apiLogout, readStoredSession, storeSession } from "@/lib/api/auth";
import type { Session } from "@/types";

type AuthCtx = {
  session: Session | null;
  ready: boolean; // false until localStorage has been read (avoids redirect flashes)
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setSession(readStoredSession());
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const s = await apiLogin(email, password);
    storeSession(s);
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    storeSession(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, ready, login, logout }), [session, ready, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
