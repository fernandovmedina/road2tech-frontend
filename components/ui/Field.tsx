import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  id,
  error,
  className = "",
  endAdornment,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; error?: string; endAdornment?: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`min-h-11 w-full rounded-[10px] border bg-white px-3 text-sm text-foreground ${endAdornment ? "pr-12" : ""} ${error ? "border-alert" : "border-line"}`}
          {...rest}
        />
        {endAdornment && <div className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</div>}
      </div>
      {error && <p id={`${id}-err`} className="text-xs font-medium text-alert-dark">{error}</p>}
    </div>
  );
}
