import type { ReactNode } from "react";

type CardShellProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/** Frame shared by every component the copilot renders inside the chat. */
export function CardShell({ eyebrow, title, subtitle, aside, children, footer }: CardShellProps) {
  return (
    <section className="my-2 w-full rounded-2xl border border-line bg-surface text-ink shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">{eyebrow}</p>
          <h3 className="mt-0.5 text-base font-semibold leading-snug">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-sm text-ink-secondary">{subtitle}</p> : null}
        </div>
        {aside ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div> : null}
      </header>
      <div className="space-y-4 px-5 py-4">{children}</div>
      {footer ? <footer className="border-t border-line px-5 py-3 text-xs text-ink-muted">{footer}</footer> : null}
    </section>
  );
}
