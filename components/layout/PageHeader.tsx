import type { ReactNode } from "react";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-extrabold leading-tight">{title}</h1>
          <SampleDataBadge />
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-end gap-3">{children}</div>}
    </header>
  );
}
