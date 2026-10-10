"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/envelope";
import { useMeta, useSavePolicy, useStockPolicy, useSuggestPolicy } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { t } from "@/lib/labels";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import type { PolicyItem } from "@/types";
import { PolicyRow } from "./PolicyRow";
import { editFromSuggestion, hasErrors, isDirty, validateEdit, type PolicyEdit, type PolicySuggestionItem } from "./policyEdits";

const P = copy.products;
const PAGE_SIZE = 25;

/**
 * Min/max editor for one store. The parent keys it by store id, so switching store starts from a clean state.
 * Edits and AI suggestions survive page/filter changes; nothing is persisted until the user presses Save.
 */
export function PolicyEditor({ storeId }: { storeId: string }) {
  const toast = useToast();
  const meta = useMeta();
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<string, PolicyEdit>>({});
  const [suggestions, setSuggestions] = useState<Record<string, PolicySuggestionItem>>({});
  const [applied, setApplied] = useState(false);

  const policy = useStockPolicy(storeId, { page, pageSize: PAGE_SIZE, categoryId: categoryId || undefined, q: q || undefined });
  const suggest = useSuggestPolicy();
  const save = useSavePolicy();

  const rows = policy.data?.items;
  const dirtyIds = Object.keys(edits);
  const anyInvalid = dirtyIds.some((id) => hasErrors(validateEdit(edits[id])));
  const suggestionCount = Object.keys(suggestions).length;

  const categories = useMemo(
    () =>
      (meta.data?.categories ?? [])
        .map((c) => ({ id: c.category_id, name: t("category", c.category_id) }))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [meta.data],
  );

  useEffect(() => {
    if (dirtyIds.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyIds.length]);

  const changeField = (item: PolicyItem, field: "min" | "max", value: string) => {
    setEdits((prev) => {
      const current: PolicyEdit = prev[item.product_id] ?? {
        min: String(item.reorder_point),
        max: String(item.max_stock),
        baseMin: item.reorder_point,
        baseMax: item.max_stock,
      };
      const next = { ...current, [field]: value };
      const out = { ...prev };
      if (isDirty(next)) out[item.product_id] = next;
      else delete out[item.product_id];
      return out;
    });
  };

  const requestSuggestions = () => {
    if (!rows?.length) return;
    suggest.mutate(
      { storeId, productIds: rows.map((r) => r.product_id) },
      {
        onSuccess: (res) => {
          setSuggestions((prev) => ({ ...prev, ...Object.fromEntries(res.items.map((i) => [i.product_id, i])) }));
          setApplied(false);
        },
      },
    );
  };

  const applySuggestions = () => {
    setEdits((prev) => {
      const out = { ...prev };
      for (const s of Object.values(suggestions)) {
        const edit = editFromSuggestion(s);
        if (edit) out[s.product_id] = edit;
        else delete out[s.product_id];
      }
      return out;
    });
    setApplied(true);
  };

  const dismissSuggestions = () => {
    setSuggestions({});
    setApplied(false);
    suggest.reset();
  };

  const saveChanges = () => {
    const items = dirtyIds.map((id) => ({ product_id: id, reorder_point: Number(edits[id].min), max_stock: Number(edits[id].max) }));
    save.mutate(
      { storeId, items },
      {
        onSuccess: () => {
          setEdits({});
          setSuggestions({});
          setApplied(false);
          toast.show(P.saved);
        },
      },
    );
  };

  const saveError = save.error instanceof ApiError && save.error.code === "invalid_policy" ? P.invalidPolicy : P.saveError;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5">
        <div className="flex flex-wrap items-end gap-3">
          <SearchField id="products-search" label={P.search} placeholder={P.searchPlaceholder} onSearch={(v) => { setQ(v); setPage(1); }} className="w-56" />
          <Select
            id="products-category"
            label={copy.common.category}
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="w-56"
          >
            <option value="">{copy.common.allCategories}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={requestSuggestions} disabled={suggest.isPending || !rows?.length}>
            <span aria-hidden>✦</span>
            {suggest.isPending ? P.suggesting : P.suggest}
          </Button>
          <Button onClick={saveChanges} disabled={dirtyIds.length === 0 || anyInvalid || save.isPending}>
            {save.isPending ? P.saving : P.save}
          </Button>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col gap-2 px-5 pt-3 empty:hidden">
        {dirtyIds.length > 0 && <p className="text-sm font-semibold text-accent-dark">{P.unsavedCount(dirtyIds.length)}</p>}
        {anyInvalid && <p className="text-sm font-semibold text-alert-dark">{P.fixErrors}</p>}
        {applied && dirtyIds.length > 0 && <p className="text-sm text-primary">{P.appliedHint}</p>}
        {suggest.isSuccess && suggestionCount === 0 && <p className="text-sm text-muted">{P.suggestionsNone}</p>}
      </div>

      {suggestionCount > 0 && (
        <div className="mx-5 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-tint px-4 py-3">
          <p className="text-sm font-semibold text-primary">{P.suggestionsReady(suggestionCount)}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={applySuggestions}>{P.apply}</Button>
            <Button size="sm" variant="ghost" onClick={dismissSuggestions}>{P.dismissSuggestions}</Button>
          </div>
        </div>
      )}

      {(suggest.isError || save.isError) && (
        <div role="alert" className="mx-5 mt-3 rounded-xl border border-alert/30 bg-alert-tint px-4 py-3 text-sm font-semibold text-alert-dark">
          {save.isError ? saveError : P.suggestError}
        </div>
      )}

      <div className="mt-4">
        {policy.isPending ? (
          <div className="flex flex-col gap-2 px-5 pb-5" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : policy.isError ? (
          <div className="px-5 pb-5"><ErrorState onRetry={() => policy.refetch()} /></div>
        ) : policy.data.items.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState text={P.empty} />
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${policy.isPlaceholderData ? "opacity-60" : ""}`}>
              <table className="w-full min-w-[920px] text-left text-sm">
                <caption className="sr-only">{P.tableLabel}</caption>
                <thead className="border-y border-line text-xs font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3">{P.cols.product}</th>
                    <th scope="col" className="py-3 pr-3">{P.cols.category}</th>
                    <th scope="col" className="py-3 pr-3 text-right">{P.cols.cost}</th>
                    <th scope="col" className="py-3 pr-3 text-right">{P.cols.price}</th>
                    <th scope="col" className="py-3 pr-3 text-right">{P.cols.minOrder}</th>
                    <th scope="col" className="py-3 pr-3 text-right">{P.cols.shelfLife}</th>
                    <th scope="col" className="py-3 pr-3 text-right">{P.cols.min}</th>
                    <th scope="col" className="py-3 pr-5 text-right">{P.cols.max}</th>
                  </tr>
                </thead>
                <tbody>
                  {policy.data.items.map((item) => (
                    <PolicyRow
                      key={item.product_id}
                      item={item}
                      edit={edits[item.product_id]}
                      suggestion={suggestions[item.product_id]}
                      onChange={(field, value) => changeField(item, field, value)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={policy.data.page} pageSize={policy.data.page_size} total={policy.data.total} onChange={setPage} disabled={policy.isPlaceholderData} />
          </>
        )}
      </div>
    </Card>
  );
}
