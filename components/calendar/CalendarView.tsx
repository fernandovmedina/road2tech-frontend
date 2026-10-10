"use client";

import { useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { PageHeader } from "@/components/layout/PageHeader";
import { BranchSelect, useEffectiveBranch } from "@/components/layout/BranchSelect";
import { EmptyState } from "@/components/ui/States";
import { CalendarContent } from "./CalendarContent";

export function CalendarView() {
  const params = useSearchParams();
  const setBranch = useFilters((s) => s.setBranch);
  const branchId = useEffectiveBranch();

  const storeParam = params.get("store");
  const productParam = params.get("product");
  const rawDate = params.get("date");
  const dateParam = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

  // Deep link ("Ver en calendario"): the store in the URL becomes the active branch before the first paint.
  useLayoutEffect(() => {
    if (storeParam) setBranch(storeParam);
  }, [storeParam, setBranch]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.calendar.title} subtitle={copy.calendar.subtitle}>
        <BranchSelect id="calendar-branch" includeAll={false} />
      </PageHeader>

      {branchId === "all" ? (
        <EmptyState title={copy.calendar.chooseBranch.title} text={copy.calendar.chooseBranch.text} />
      ) : (
        <CalendarContent
          key={`${storeParam ?? ""}|${productParam ?? ""}|${dateParam ?? ""}`}
          storeId={branchId}
          initialDate={dateParam}
          initialProduct={productParam}
        />
      )}
    </div>
  );
}
