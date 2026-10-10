"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStores } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { productHref } from "@/lib/links";
import { Select } from "@/components/ui/Select";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";
import { StatusTimeline } from "@/components/strategy/StatusTimeline";
import type { StrategyStatus } from "@/types";

export const backLinkClass =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-sm font-semibold hover:bg-background";

/** "← Regresar al mapa": back to the dashboard, where the map lives. */
export function BackLink() {
  return (
    <Link href="/" className={backLinkClass}>
      <span aria-hidden>←</span> {copy.product.back}
    </Link>
  );
}

/**
 * Store selector of the detail screen. It changes the global branch filter (so the other screens follow) and the
 * `?store=` of the URL; the old `?strategy=` is dropped because a promotion belongs to one store.
 */
function StoreSelect({ productId, storeId }: { productId: string; storeId: string }) {
  const stores = useStores().data ?? [];
  const setBranch = useFilters((s) => s.setBranch);
  const router = useRouter();
  const options = stores
    .map((s) => ({ id: s.store_id, name: displayBranchName(s) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <Select
      id="product-store"
      label={copy.common.branch}
      value={storeId}
      onChange={(e) => {
        const next = e.target.value;
        if (!next || next === storeId) return;
        setBranch(next);
        router.replace(productHref(productId, { storeId: next }));
      }}
      className="min-w-52"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </Select>
  );
}

/**
 * Title row: back button and product name with its subtitle on the left (and the compact lifecycle line when there is
 * a promotion), store selector and sample-data badge on the right.
 */
export function ProductHeader({
  productId,
  storeId,
  title,
  subtitle,
  status,
}: {
  productId: string;
  storeId: string;
  title: string;
  subtitle: string;
  status: StrategyStatus | null;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-wrap items-start gap-4">
        <BackLink />
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight">{title}</h1>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          {status && (
            <div className="mt-3 max-w-md">
              <StatusTimeline status={status} />
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <StoreSelect productId={productId} storeId={storeId} />
        <div className="flex min-h-11 items-center">
          <SampleDataBadge />
        </div>
      </div>
    </header>
  );
}
