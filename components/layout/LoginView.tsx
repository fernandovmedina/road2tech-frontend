"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthError } from "@/lib/api/auth";
import { usesMockData } from "@/lib/api/config";
import { ApiError } from "@/lib/api/envelope";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

const L = copy.login;

export function LoginView() {
  const { session, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace("/");
  }, [ready, session, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = L.errors.emailRequired;
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = L.errors.emailInvalid;
    if (!password) next.password = L.errors.passwordRequired;
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      // Wrong credentials and connectivity/server problems are different situations for the user.
      const form =
        err instanceof AuthError
          ? L.errors.credentials
          : err instanceof ApiError && err.kind === "network"
            ? L.errors.network
            : L.errors.server;
      setErrors({ form });
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <span aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-heat-4/40 blur-3xl" />
        <span aria-hidden className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-heat-3/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl font-extrabold">S</span>
          <span className="text-2xl font-extrabold">{copy.shell.brand}</span>
        </div>
        <div className="relative max-w-lg">
          <h2 className="text-[40px] font-extrabold leading-[1.1]">{L.tagline}</h2>
          <ul className="mt-8 flex flex-col gap-4">
            {L.benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-base text-sidebar-text">
                <span aria-hidden className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs">✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-text/60">{L.footer}</p>
      </section>

      <section className="flex items-center justify-center bg-white p-6">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4">
          <div>
            <h1 className="text-[28px] font-extrabold">{L.title}</h1>
            <p className="mt-1 text-sm text-muted">{L.subtitle}</p>
          </div>

          {errors.form && (
            <p role="alert" className="rounded-[10px] border border-alert/30 bg-alert-tint px-3 py-2.5 text-sm font-semibold text-alert-dark">
              {errors.form}
            </p>
          )}

          <Field id="email" type="email" autoComplete="email" label={L.email} value={email} error={errors.email} onChange={(e) => setEmail(e.target.value)} />
          <Field
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            label={L.password}
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? L.hidePassword : L.showPassword}
                aria-pressed={showPassword}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-foreground"
              >
                <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="m1 1 22 22" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            }
          />

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? L.submitting : L.submit}
          </Button>
          {usesMockData && <p className="text-center text-xs text-muted">{L.demoHint}</p>}
        </form>
      </section>
    </div>
  );
}
