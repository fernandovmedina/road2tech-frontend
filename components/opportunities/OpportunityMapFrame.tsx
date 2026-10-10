import type { ReactNode } from "react";

/** Simple stacking wrapper for the opportunity-map content. The page shell (header, padding) lives in the app layout. */
export function OpportunityMapFrame({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 font-sans text-foreground [color-scheme:light]">{children}</div>;
}
