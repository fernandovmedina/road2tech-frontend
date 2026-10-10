"use client";

import { ExternalLink, Globe2 } from "lucide-react";
import { copy } from "@/lib/copy";
import type { BlockOf } from "./chatTypes";

const C = copy.chat.market;

/** Read-only market evidence returned by the backend Lambda after a Brave Search API lookup. */
export function MarketComparisonBlock({ block }: { block: BlockOf<"market_comparison"> }) {
  return (
    <section aria-labelledby="market-comparison-title" className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-primary-tint p-2 text-primary">
          <Globe2 aria-hidden className="size-5" />
        </span>
        <div>
          <h3 id="market-comparison-title" className="font-extrabold">{C.title}</h3>
          <p className="text-sm text-muted">{C.query(block.query)}</p>
        </div>
      </div>

      {block.items.length > 0 ? (
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {block.items.map((item) => (
            <li key={item.url} className="rounded-xl border border-line p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-muted">{item.source}</p>
                  <h4 className="mt-0.5 font-bold leading-snug">{item.title}</h4>
                </div>
                {item.price_text ? <span className="shrink-0 text-sm font-extrabold text-primary">{item.price_text}</span> : null}
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{item.description}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                {C.openSource}
                <ExternalLink aria-hidden className="size-3.5" />
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted">{C.empty}</p>
      )}

      <p className="mt-4 text-xs text-muted">{C.disclaimer}</p>
    </section>
  );
}
