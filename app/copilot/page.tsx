import type { Metadata } from "next";
import { Suspense } from "react";

import "@copilotkit/react-core/v2/styles.css";

import { CopilotWorkspace } from "@/components/copilot/CopilotWorkspace";

export const metadata: Metadata = {
  title: "Copilot · StockCopilot",
  description: "Chat with the StockCopilot agent: trends, restock suggestions and promotion strategies.",
};

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" className="flex h-dvh flex-col">
      <div className="h-16 border-b border-line bg-surface" />
      <div className="mx-auto mt-8 h-64 w-full max-w-5xl animate-pulse rounded-2xl bg-surface-muted" />
    </div>
  );
}

export default function CopilotPage() {
  // The chat creates per-visit ids (threads, messages), so it streams in instead of being prerendered.
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <CopilotWorkspace />
    </Suspense>
  );
}
