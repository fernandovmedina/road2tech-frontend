import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({
  label,
  id,
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
      <select
        id={id}
        className={cn(
          "min-h-10 rounded-control border border-line bg-card px-3 text-sm font-medium text-foreground",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15",
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
