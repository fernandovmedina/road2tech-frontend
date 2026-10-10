"use client";

import { useId, useMemo, useState } from "react";
import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { t } from "@/lib/labels";

const MAX_RESULTS = 6;

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Catalog autocomplete (combobox pattern) over the full cached catalog.
export function ProductSearch({ onSelect }: { onSelect: (productId: string) => void }) {
  const { data } = useCatalog();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const id = useId();

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return (data ?? [])
      .filter((p) => normalize(p.product_name).includes(q) || normalize(p.brand).includes(q))
      .slice(0, MAX_RESULTS);
  }, [data, query]);

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">{copy.dashboard.analysis.searchProduct}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && matches.length > 0}
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
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 top-full z-[1000] mt-1 w-full min-w-72 overflow-hidden rounded-[10px] border border-line bg-white shadow-lg">
          {matches.map((p) => (
            <li key={p.product_id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(p.product_id); setQuery(p.product_name); setOpen(false); }}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-primary-tint"
              >
                <span className="font-semibold">{p.product_name}</span>
                <span className="shrink-0 text-xs text-muted">{t("category", p.category_id)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
