"use client";

import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { PageHeader } from "@/components/layout/PageHeader";
import { useEffectiveBranch } from "@/components/layout/BranchSelect";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { BehaviorCards } from "@/components/dashboard/BehaviorCards";
import { BranchAnalysis } from "@/components/dashboard/BranchAnalysis";
import { AssistantChat } from "@/components/chat/AssistantChat";

export function DashboardView() {
  const { mode, range } = useFilters();
  const branchId = useEffectiveBranch();
  const scope = { branchId, mode, range };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.dashboard.title} subtitle={copy.dashboard.subtitle}>
        <DashboardControls />
      </PageHeader>
      <KpiCards scope={scope} />
      <BehaviorCards scope={scope} />
      <BranchAnalysis scope={scope} />
      <AssistantChat branchId={branchId} />
    </div>
  );
}
