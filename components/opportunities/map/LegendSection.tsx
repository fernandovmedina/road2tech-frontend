import type { ReactNode } from "react";

export function LegendSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 font-medium text-ink-secondary">{title}</h4>
      {children}
    </section>
  );
}
