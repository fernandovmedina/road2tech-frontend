"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastCtx = { show: (msg: string) => void };
const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const show = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div aria-live="polite" className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {items.map((i) => (
          <div key={i.id} className="rounded-xl bg-sidebar px-4 py-3 text-sm font-semibold text-white shadow-lg">{i.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
