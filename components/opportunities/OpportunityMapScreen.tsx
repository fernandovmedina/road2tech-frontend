"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { copy } from "@/lib/copy";
import { useOpportunityMapData } from "@/lib/api/opportunityMap";
import { ALL_PRODUCTS_ID } from "@/lib/api/storeDemand";
import { OpportunityMapContent } from "./OpportunityMapContent";
import { OpportunityMapFrame } from "./OpportunityMapFrame";
import { OpportunityMapSkeleton } from "./OpportunityMapSkeleton";

type OpportunityMapScreenProps = {
  embedded?: boolean;
  /** Controlled branch (e.g. the dashboard store filter). Falls back to local state when undefined. */
  branchId?: string;
  onBranchChange?: (branchId: string) => void;
};

export function OpportunityMapScreen({ embedded = false, branchId, onBranchChange }: OpportunityMapScreenProps) {
  const [selectedProductId, setSelectedProductId] = useState(ALL_PRODUCTS_ID);
  const [localBranchId, setLocalBranchId] = useState("S001");
  const selectedBranchId = branchId ?? localBranchId;
  const setSelectedBranchId = (next: string) => {
    setLocalBranchId(next);
    onBranchChange?.(next);
  };
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState("all");
  const state = useOpportunityMapData({
    productId: selectedProductId,
    category: category === "all" ? undefined : category,
    tag: tag === "all" ? undefined : tag,
  });

  if (state.status === "pending") return <OpportunityMapSkeleton embedded={embedded} />;

  if (state.status === "error") {
    return (
      <OpportunityMapFrame>
        <Card>
          <StatusMessage
            tone="error"
            title={copy.opportunities.error.title}
            description={copy.opportunities.error.description}
            action={
              <Button variant="primary" loading={state.isRetrying} onClick={state.retry} className="mt-2">
                {copy.opportunities.error.retry}
              </Button>
            }
          />
        </Card>
      </OpportunityMapFrame>
    );
  }

  return (
    <OpportunityMapContent
      data={state.data}
      selectedProductId={selectedProductId}
      selectedBranchId={selectedBranchId}
      category={category}
      tag={tag}
      onProductChange={setSelectedProductId}
      onBranchChange={setSelectedBranchId}
      onCategoryChange={(nextCategory) => {
        setCategory(nextCategory);
        setSelectedProductId(ALL_PRODUCTS_ID);
      }}
      onTagChange={(nextTag) => {
        setTag(nextTag);
        setSelectedProductId(ALL_PRODUCTS_ID);
      }}
      embedded={embedded}
    />
  );
}
