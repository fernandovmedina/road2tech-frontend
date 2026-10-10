import type { ReactNode } from "react";

type OpportunityMapFrameProps = {
  controls?: ReactNode;
  children: ReactNode;
  embedded?: boolean;
};

export function OpportunityMapFrame({ controls, children, embedded = false }: OpportunityMapFrameProps) {
  if (embedded) {
    return <div className="flex flex-col gap-4 font-sans text-ink [color-scheme:light]">{children}</div>;
  }

  return (
    <div className="min-h-dvh bg-plane font-sans text-ink [color-scheme:light]">
      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              StockCopilot · Store intelligence
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Product demand by store — Saltillo
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Explore forecast demand, inventory coverage and suggested stock for every branch.
            </p>
          </div>
          {controls}
        </header>
        {children}
      </main>
    </div>
  );
}
