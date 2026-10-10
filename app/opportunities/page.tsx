import type { Metadata } from "next";
import { OpportunityMapScreenLoader } from "@/components/opportunities/OpportunityMapScreenLoader";

export const metadata: Metadata = {
  title: "Product demand by store — Saltillo | StockCopilot",
  description:
    "Product demand, inventory coverage and replenishment predictions across Saltillo branches.",
};

export default function OpportunitiesPage() {
  return <OpportunityMapScreenLoader />;
}
