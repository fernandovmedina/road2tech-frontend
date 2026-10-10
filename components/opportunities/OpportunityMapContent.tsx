import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusMessage } from "@/components/ui/StatusMessage";
import type { OpportunityMapData } from "@/lib/api/opportunityMap";
import { ALL_PRODUCTS_ID } from "@/lib/api/storeDemand";
import { readableTag } from "@/lib/opportunities/storePresentation";
import { BranchProductOverviewPanel } from "./BranchProductOverviewPanel";
import { OpportunityMapFrame } from "./OpportunityMapFrame";
import { ProductMapFilters } from "./ProductMapFilters";
import { StoreDemandKpis } from "./StoreDemandKpis";
import { StorePredictionPanel } from "./StorePredictionPanel";
import { StoreDemandMapCanvas } from "./map/StoreDemandMapCanvas";

type OpportunityMapContentProps = {
  data: OpportunityMapData;
  selectedProductId: string;
  selectedBranchId: string;
  category: string;
  tag: string;
  onProductChange: (productId: string) => void;
  onBranchChange: (branchId: string) => void;
  onCategoryChange: (category: string) => void;
  onTagChange: (tag: string) => void;
  embedded?: boolean;
};

export function OpportunityMapContent({
  data,
  selectedProductId,
  selectedBranchId,
  category,
  tag,
  onProductChange,
  onBranchChange,
  onCategoryChange,
  onTagChange,
  embedded = false,
}: OpportunityMapContentProps) {
  const [search, setSearch] = useState("");

  const isGeneralView = selectedProductId === ALL_PRODUCTS_ID;
  const selectedProduct = data.products.find((product) => product.id === selectedProductId);
  const selectedBranch =
    data.branches.find((branch) => branch.id === selectedBranchId) ?? data.branches[0];
  const selectedPrediction = data.predictions.find(
    (prediction) => prediction.branchId === selectedBranch?.id,
  );

  const categories = useMemo(
    () => [...new Set(data.products.map((product) => product.category))].sort(),
    [data.products],
  );
  const tags = useMemo(
    () => [...new Set(data.products.flatMap((product) => product.tags))].sort(),
    [data.products],
  );
  const matchingProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.products.filter(
      (product) =>
        (category === "all" || product.category === category) &&
        (tag === "all" || product.tags.includes(tag)) &&
        (!query || `${product.name} ${product.brand}`.toLowerCase().includes(query)),
    );
  }, [category, data.products, search, tag]);
  const filterProducts = selectedProduct
    ? [selectedProduct, ...matchingProducts.filter((product) => product.id !== selectedProduct.id)]
    : matchingProducts;

  if ((!isGeneralView && !selectedProduct) || !selectedBranch || !selectedPrediction) {
    return (
      <OpportunityMapFrame embedded={embedded}>
        <Card className="p-6">
          <StatusMessage
            tone="empty"
            title="No demand predictions available"
            description="Choose another product or remove the mock empty-state parameter from the URL."
          />
        </Card>
      </OpportunityMapFrame>
    );
  }

  return (
    <OpportunityMapFrame embedded={embedded}>
      <ProductMapFilters
        products={filterProducts}
        categories={categories}
        tags={tags.map(readableTag)}
        selectedProductId={selectedProductId}
        category={category}
        tag={tag === "all" ? "all" : readableTag(tag)}
        search={search}
        onProductChange={onProductChange}
        onCategoryChange={onCategoryChange}
        onTagChange={(label) => {
          const rawTag = tags.find((item) => readableTag(item) === label) ?? "all";
          onTagChange(rawTag);
        }}
        onSearchChange={setSearch}
      />

      <StoreDemandKpis predictions={data.predictions} />

      <div className={`grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem] ${embedded ? "xl:min-h-[600px]" : "xl:h-[calc(100dvh-18rem)] xl:min-h-[620px]"}`}>
        <Card className="relative min-h-[32rem] overflow-hidden">
          <StoreDemandMapCanvas
            branches={data.branches}
            predictions={data.predictions}
            selectedBranchId={selectedBranch.id}
            onSelectBranch={onBranchChange}
          />
        </Card>
        <Card className="xl:min-h-0 xl:overflow-hidden">
          <div key={`${selectedBranch.id}:${selectedProductId}:${category}:${tag}`} className="p-5 xl:h-full xl:overflow-y-auto">
            {isGeneralView ? (
              <BranchProductOverviewPanel
                branch={selectedBranch}
                category={category === "all" ? undefined : category}
                tag={tag === "all" ? undefined : tag}
                onSelectProduct={onProductChange}
              />
            ) : selectedProduct ? (
              <StorePredictionPanel
                branch={selectedBranch}
                product={selectedProduct}
                prediction={selectedPrediction}
              />
            ) : null}
          </div>
        </Card>
      </div>

      <p className="text-xs text-ink-secondary">
        Synthetic demo aligned with BackendRoad2Tech dataset v2. Forecasts combine product demand,
        store zone, weather sensitivity and commercial demand drivers. No live backend is connected yet.
      </p>
    </OpportunityMapFrame>
  );
}
