"use client";

import { ExternalLink } from "lucide-react";
import { copy } from "@/lib/copy";
import type { MarketComparison } from "@/types";

const C = copy.chat.market;

/** A link is shown only when it is https: the results come from a web search and are never trusted as markup or schemes. */
const isHttps = (url: string) => /^https:\/\//i.test(url);

/** Results of a market comparison (Brave Search) as plain text; each source opens in a new tab. */
export function MarketItemList({ items }: { items: MarketComparison["items"] }) {
  if (items.length === 0) return <p className="text-sm text-muted">{C.empty}</p>;
  return (
    <ol className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <li key={item.url} className="flex flex-col rounded-block bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted">{item.source}</p>
              <h4 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug">{item.title}</h4>
            </div>
            {item.price_text ? <span className="shrink-0 text-sm font-bold text-primary">{item.price_text}</span> : null}
          </div>
          {item.description ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{item.description}</p> : null}
          {isHttps(item.url) && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-auto inline-flex min-h-10 items-center gap-1.5 pt-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {C.openSource}
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}
