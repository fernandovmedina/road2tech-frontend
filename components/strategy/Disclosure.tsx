"use client";

import { useId, useState, type ReactNode } from "react";

/** Folded block with a real button (aria-expanded / aria-controls), used for the technical details of a card. */
export function Disclosure({
  label,
  children,
  className = "",
  buttonClassName = "text-primary hover:text-primary-hover",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-[10px] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${buttonClassName}`}
      >
        <span aria-hidden className={`inline-block text-xs transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        {label}
      </button>
      {open && <div id={panelId} className="mt-1">{children}</div>}
    </div>
  );
}
