import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  id,
  error,
  className = "",
  endAdornment,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; error?: string; endAdornment?: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn(
            "min-h-10 w-full rounded-control border bg-card px-3 text-sm text-foreground",
            "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15",
            endAdornment ? "pr-12" : "",
            error ? "border-alert" : "border-line",
          )}
          {...rest}
        />
        {endAdornment && <div className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</div>}
      </div>
      {error && <p id={`${id}-err`} className="text-xs font-medium text-alert-dark">{error}</p>}
    </div>
  );
}
