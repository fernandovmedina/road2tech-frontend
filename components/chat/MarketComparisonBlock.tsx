"use client";

import { useId } from "react";
import { Globe2 } from "lucide-react";
import { copy } from "@/lib/copy";
import { MarketItemList } from "@/components/market/MarketItemList";
import { Card } from "@/components/ui/Card";
import type { BlockOf } from "./chatTypes";

const C = copy.chat.market;

/** Read-only market evidence returned by the backend Lambda after a Brave Search API lookup. */
export function MarketComparisonBlock({ block }: { block: BlockOf<"market_comparison"> }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-block bg-primary-tint text-primary">
            <Globe2 aria-hidden className="size-5" />
          </span>
          <div>
            <h3 id={titleId} className="text-base font-bold">{C.title}</h3>
            <p className="text-sm text-muted">{C.query(block.query)}</p>
          </div>
        </div>
        <MarketItemList items={block.items} />
        <p className="text-xs font-medium text-muted">{C.disclaimer}</p>
      </Card>
    </section>
  );
}
