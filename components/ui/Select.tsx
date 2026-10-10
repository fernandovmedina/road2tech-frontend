import type { SelectHTMLAttributes } from "react";

export function Select({
  label,
  id,
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
      <select
        id={id}
        className="min-h-11 rounded-[10px] border border-line bg-white px-3 text-sm font-medium text-foreground"
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
