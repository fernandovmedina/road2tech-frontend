"use client";

import { useEffect, useMemo, useState } from "react";
import { useProducts, useSaveMinMax, useSuggestMinMax, type MinMaxSuggestion } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { categories } from "@/lib/mock/seed";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

const P = copy.products;

type Draft = Record<string, { min: string; max: string }>;
const isInt = (v: string) => /^\d+$/.test(v.trim());

export function ProductsView() {
  const products = useProducts();
  const save = useSaveMinMax();
  const suggest = useSuggestMinMax();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<MinMaxSuggestion[] | null>(null);
  const [applied, setApplied] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    if (!products.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialise editable drafts from server data
    setDraft(Object.fromEntries(products.data.map((p) => [p.id, { min: String(p.minStock), max: String(p.maxStock) }])));
    setDirty(new Set());
  }, [products.data]);

  const rows = useMemo(
    () =>
      (products.data ?? []).filter(
        (p) => (category === "all" || p.category === category) && p.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [products.data, category, query],
  );

  const errorFor = (id: string): string | null => {
    const d = draft[id];
    if (!d) return null;
    if (!isInt(d.min) || !isInt(d.max)) return P.invalidNumber;
    if (Number(d.min) > Number(d.max)) return P.minGtMax;
    return null;
  };
  const anyError = Object.keys(draft).some((id) => errorFor(id));

  const edit = (id: string, key: "min" | "max", value: string) => {
    setDraft((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));
    setDirty((s) => new Set(s).add(id));
  };

  async function onSave() {
    const payload: Record<string, { minStock: number; maxStock: number }> = {};
    for (const id of dirty) payload[id] = { minStock: Number(draft[id].min), maxStock: Number(draft[id].max) };
    await save.mutateAsync(payload);
    setApplied(false);
    toast.show(P.saved);
  }

  async function onSuggest() {
    setApplied(false);
    setSuggestions(await suggest.mutateAsync());
  }

  function onApply() {
    if (!suggestions) return;
    setDraft((d) => {
      const next = { ...d };
      for (const s of suggestions) next[s.productId] = { min: String(s.minStock), max: String(s.maxStock) };
      return next;
    });
    setDirty(new Set(suggestions.map((s) => s.productId)));
    setApplied(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={P.title} subtitle={P.subtitle}>
        <Button variant="secondary" onClick={onSuggest} disabled={suggest.isPending || products.isPending}>
          ✦ {suggest.isPending ? P.suggesting : P.suggest}
        </Button>
        {suggestions && <Button variant="accent" onClick={onApply}>{P.apply}</Button>}
        <Button onClick={onSave} disabled={dirty.size === 0 || anyError || save.isPending}>{P.save}</Button>
      </PageHeader>

      {applied && <p role="status" className="rounded-[10px] bg-accent-tint px-4 py-2.5 text-sm font-semibold text-accent-dark">{P.appliedHint}</p>}
      {dirty.size > 0 && !applied && <p role="status" className="text-sm font-semibold text-accent-dark">{copy.common.unsaved}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="product-search" className="text-xs font-semibold text-muted">{P.search}</label>
          <input
            id="product-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-11 w-64 max-w-full rounded-[10px] border border-line bg-white px-3 text-sm"
          />
        </div>
        <Select id="product-category" label={copy.common.category} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{copy.common.allCategories}</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {products.isError ? (
        <ErrorState onRetry={() => products.refetch()} />
      ) : (
        <Card className="overflow-x-auto p-0">
          {products.isPending ? (
            <div className="flex flex-col gap-2 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState className="m-5" text={P.empty} />
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-muted">
                  <th className="px-5 py-3">{P.cols.product}</th>
                  <th className="py-3 pr-3">{P.cols.category}</th>
                  <th className="py-3 pr-3 text-right">{P.cols.cost}</th>
                  <th className="py-3 pr-3 text-right">{P.cols.price}</th>
                  <th className="py-3 pr-3 text-right">{P.cols.caseSize}</th>
                  <th className="py-3 pr-3">{P.cols.shelfLife}</th>
                  <th className="py-3 pr-3">{P.cols.min}</th>
                  <th className="py-3 pr-5">{P.cols.max}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const d = draft[p.id];
                  const err = errorFor(p.id);
                  const sug = suggestions?.find((s) => s.productId === p.id);
                  return (
                    <tr key={p.id} className="border-b border-line align-top last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-muted">{p.sku}</p>
                        {sug && (
                          <p className="mt-1 max-w-xs rounded-md bg-accent-tint px-2 py-1 text-xs text-accent-dark">
                            <strong>{P.suggestionLabel}: {sug.minStock}/{sug.maxStock}.</strong> {sug.reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3">{p.category}</td>
                      <td className="py-3 pr-3 text-right">{formatMoney(p.unitCost)}</td>
                      <td className="py-3 pr-3 text-right">{formatMoney(p.price)}</td>
                      <td className="py-3 pr-3 text-right">{p.caseSize}</td>
                      <td className="py-3 pr-3">{P.shelfLifeDays(p.shelfLifeDays)}</td>
                      <td className="py-2 pr-3">
                        <label className="sr-only" htmlFor={`min-${p.id}`}>{P.cols.min} {p.name}</label>
                        <input
                          id={`min-${p.id}`}
                          inputMode="numeric"
                          value={d?.min ?? ""}
                          aria-invalid={!!err}
                          onChange={(e) => edit(p.id, "min", e.target.value)}
                          className={`min-h-11 w-20 rounded-[10px] border px-3 text-sm ${err ? "border-alert" : "border-line"} ${dirty.has(p.id) ? "bg-accent-tint/50" : "bg-white"}`}
                        />
                      </td>
                      <td className="py-2 pr-5">
                        <label className="sr-only" htmlFor={`max-${p.id}`}>{P.cols.max} {p.name}</label>
                        <input
                          id={`max-${p.id}`}
                          inputMode="numeric"
                          value={d?.max ?? ""}
                          aria-invalid={!!err}
                          onChange={(e) => edit(p.id, "max", e.target.value)}
                          className={`min-h-11 w-20 rounded-[10px] border px-3 text-sm ${err ? "border-alert" : "border-line"} ${dirty.has(p.id) ? "bg-accent-tint/50" : "bg-white"}`}
                        />
                        {err && <p role="alert" className="mt-1 max-w-[140px] text-xs font-medium text-alert-dark">{err}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
