"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { ProductsPanel } from "./ProductsPanel";
import { PromotionsPanel } from "./PromotionsPanel";

const A = copy.dashboard.analysis;
type Tab = "products" | "promotions";

/** Side panel of the store view: catalog products | promotions from the store's plan. */
export function StoreSidePanel({ storeId, pinnedProductId }: { storeId: string; pinnedProductId: string | null }) {
  const [tab, setTab] = useState<Tab>("products");

  return (
    <Card className="flex flex-col gap-3">
      <Tabs
        label={A.title}
        value={tab}
        onChange={setTab}
        tabs={[{ id: "products", label: A.tabs.products }, { id: "promotions", label: A.tabs.promotions }]}
      />
      {tab === "products" ? <ProductsPanel storeId={storeId} pinnedProductId={pinnedProductId} /> : <PromotionsPanel storeId={storeId} />}
    </Card>
  );
}
