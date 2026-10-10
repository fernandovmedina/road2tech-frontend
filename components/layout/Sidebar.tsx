"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";
import { getDemoState, resetDemoData, setDemoState } from "@/lib/api/client";
import { isMockMode } from "@/lib/api/config";
import type { DemoState } from "@/types";

const items = [
  { href: "/", label: copy.nav.dashboard, icon: "▦" },
  { href: "/calendar", label: copy.nav.calendar, icon: "▤" },
  { href: "/stock", label: copy.nav.stock, icon: "▥" },
  { href: "/suppliers", label: copy.nav.suppliers, icon: "⛟" },
  { href: "/products", label: copy.nav.products, icon: "◫" },
];

const demoStates: { id: DemoState; label: string }[] = [
  { id: "normal", label: copy.nav.demoNormal },
  { id: "empty", label: copy.nav.demoEmpty },
  { id: "error", label: copy.nav.demoError },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { session, logout } = useAuth();
  const [demo, setDemo] = useState<DemoState>(() => (isMockMode ? getDemoState() : "normal"));

  const changeDemo = (d: DemoState) => {
    setDemoState(d);
    setDemo(d);
    qc.invalidateQueries({ queryKey: ["api"] });
  };

  const resetDemo = () => {
    resetDemoData();
    setDemo("normal");
    qc.invalidateQueries({ queryKey: ["api"] });
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/product/") : pathname.startsWith(href));

  return (
    <aside className="flex w-full flex-col gap-6 bg-sidebar px-4 py-5 text-sidebar-text lg:fixed lg:inset-y-0 lg:left-0 lg:w-[232px] lg:overflow-y-auto">
      <Link href="/" className="flex items-center gap-2.5 rounded-lg px-2 text-white">
        <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-lg font-extrabold">S</span>
        <span className="text-lg font-extrabold">{copy.shell.brand}</span>
      </Link>

      <nav aria-label={copy.shell.mainNav} className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={isActive(it.href) ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold transition-colors ${
              isActive(it.href) ? "bg-sidebar-active text-white" : "hover:bg-sidebar-active/50"
            }`}
          >
            <span aria-hidden className="w-5 text-center text-base">{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        {isMockMode && (
          <fieldset className="rounded-xl border border-white/10 p-3">
            <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-sidebar-text/70">{copy.nav.demoStates}</legend>
            <div className="flex gap-1">
              {demoStates.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={demo === d.id}
                  onClick={() => changeDemo(d.id)}
                  className={`min-h-10 flex-1 rounded-lg px-1 text-xs font-bold ${demo === d.id ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={resetDemo}
              className="mt-2 min-h-10 w-full rounded-lg px-1 text-xs font-semibold text-sidebar-text/80 underline hover:text-white"
            >
              {copy.nav.demoReset}
            </button>
          </fieldset>
        )}

        {session && (
          <div className="rounded-xl bg-white/5 p-3">
            <p className="truncate text-sm font-bold text-white">{session.user.name}</p>
            <p className="truncate text-xs text-sidebar-text/70">{session.user.email}</p>
            <button
              type="button"
              onClick={async () => { await logout(); router.replace("/login"); }}
              className="mt-3 min-h-10 w-full rounded-lg bg-white/10 text-sm font-semibold text-white hover:bg-white/20"
            >
              {copy.nav.logout}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
