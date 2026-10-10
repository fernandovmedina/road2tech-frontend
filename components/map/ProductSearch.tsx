"use client";

import { useId, useMemo, useState } from "react";
import { useProducts } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";

// Catalog autocomplete (combobox pattern).
export function ProductSearch({ onSelect }: { onSelect: (productId: string) => void }) {
  const { data } = useProducts();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const id = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [data, query]);

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">{copy.dashboard.analysis.searchProduct}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={copy.dashboard.analysis.searchPlaceholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        className="min-h-11 w-64 max-w-full rounded-[10px] border border-line bg-white px-3 text-sm"
      />
      {open && matches.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 top-full z-[1000] mt-1 w-full overflow-hidden rounded-[10px] border border-line bg-white shadow-lg">
          {matches.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(p.id); setQuery(p.name); setOpen(false); }}
                className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm hover:bg-primary-tint"
              >
                <span className="font-semibold">{p.name}</span>
                <span className="text-xs text-muted">{p.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
