"use client";

import dynamic from "next/dynamic";
import { OpportunityMapSkeleton } from "./OpportunityMapSkeleton";

// Client-only: Leaflet needs `window`, and with Cache Components a prerender would
// capture TanStack Query state (which reads the current time) in the static shell.
const OpportunityMapScreen = dynamic(
  () => import("./OpportunityMapScreen").then((module) => module.OpportunityMapScreen),
  { ssr: false, loading: () => <OpportunityMapSkeleton /> },
);

export function OpportunityMapScreenLoader() {
  return <OpportunityMapScreen />;
}
