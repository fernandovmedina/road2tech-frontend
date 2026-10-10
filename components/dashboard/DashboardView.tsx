"use client";

import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { ChainNotice } from "@/components/dashboard/ChainNotice";
import { BehaviorCards } from "@/components/dashboard/BehaviorCards";
import { BranchAnalysis } from "@/components/dashboard/BranchAnalysis";
import { PlanPanel } from "@/components/strategy/PlanPanel";
import { AssistantChat } from "@/components/chat/AssistantChat";

export function DashboardView() {
  const { branchId, mode, range } = useFilters();
  const scope = { branchId, mode, range };
  const storeId = branchId === "all" ? null : branchId;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.dashboard.title} subtitle={copy.dashboard.subtitle}>
        <DashboardControls />
      </PageHeader>
      <KpiCards scope={scope} />
      {storeId ? (
        <>
          <PlanPanel storeId={storeId} />
          <BehaviorCards scope={scope} storeId={storeId} />
        </>
      ) : (
        <ChainNotice />
      )}
      <BranchAnalysis scope={scope} />
      {storeId && <AssistantChat storeId={storeId} />}
    </div>
  );
}
