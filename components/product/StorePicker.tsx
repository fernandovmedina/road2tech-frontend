"use client";

import { useStores } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

/** Product detail is per store. Without a store in the URL or in the global filter the user has to pick one. */
export function StorePicker() {
  const stores = useStores();
  const setBranch = useFilters((s) => s.setBranch);

  if (stores.isError) return <ErrorState onRetry={() => void stores.refetch()} />;
  if (stores.isPending) return <Skeleton className="h-40 w-full rounded-card" />;

  return (
    <Card className="flex max-w-xl flex-col gap-3">
      <h2 className="text-lg font-bold">{copy.product.pickStore.title}</h2>
      <p className="text-sm text-muted">{copy.product.pickStore.text}</p>
      <Select
        id="product-store-picker"
        label={copy.common.branch}
        value=""
        onChange={(e) => {
          if (e.target.value) setBranch(e.target.value);
        }}
      >
        <option value="">{copy.product.pickStore.placeholder}</option>
        {stores.data.map((s) => (
          <option key={s.store_id} value={s.store_id}>{displayBranchName(s)}</option>
        ))}
      </Select>
    </Card>
  );
}
