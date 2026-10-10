import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Section of a side panel (27rem): heading + optional description + content, no border of its own. */
export function PanelSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <header className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}
