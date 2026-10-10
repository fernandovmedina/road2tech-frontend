"use client";

import { HttpAgent } from "@ag-ui/client";
import { CopilotChat, CopilotKit, useAgent, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import { useEffect, useMemo } from "react";

import { BranchSelect } from "@/components/layout/BranchSelect";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { copilotUrl } from "@/lib/api/config";
import { readStoredSession } from "@/lib/api/auth";
import { useStore } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";

import { CopilotRenderers } from "./CopilotRenderers";

const C = copy.copilot;
const AGENT_ID = "stockcopilot";

/** Keeps the agent's shared state in sync with the branch selected in the dashboard. */
function SelectedStoreSync({ storeId }: { storeId: string }) {
  const { agent } = useAgent({ agentId: AGENT_ID });
  useEffect(() => {
    agent.setState({ ...(agent.state ?? {}), selected_store_id: storeId });
  }, [agent, storeId]);
  return null;
}

function Suggestions() {
  useConfigureSuggestions({ suggestions: [...C.suggestions], available: "before-first-message" }, []);
  return null;
}

/**
 * Dashboard assistant backed by the LangGraph agent over AG-UI (POST `${copilotUrl}/copilot`). The browser talks to the
 * agent directly. Loaded only through next/dynamic with ssr: false: CopilotKit creates per-visit ids that cannot be
 * prerendered. One panel per store (the parent remounts it with a key), so each store has its own conversation.
 */
export default function CopilotChatPanel({ storeId }: { storeId: string }) {
  const hasStore = storeId !== "all" && storeId !== "";
  const store = useStore(hasStore ? storeId : "all");
  const agent = useMemo(() => {
    const token = readStoredSession()?.token;
    return new HttpAgent({
      url: `${copilotUrl}/copilot`,
      agentId: AGENT_ID,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  }, []);

  return (
    <section aria-labelledby="assistant-title">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="assistant-title" className="text-lg font-bold">{C.title}</h2>
            <p className="text-sm text-muted">{C.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {hasStore && store && <Badge tone="green">{`${C.storeLabel}: ${displayBranchName(store)}`}</Badge>}
            <BranchSelect id="assistant-branch" includeAll label={copy.chat.pickStoreLabel} />
          </div>
        </div>

        {hasStore ? (
          <div className="h-[640px] overflow-hidden rounded-block border border-line bg-card">
            <CopilotKit selfManagedAgents={{ [AGENT_ID]: agent }} agentId={AGENT_ID} enableInspector={false}>
              <CopilotRenderers agentId={AGENT_ID} />
              <Suggestions />
              <SelectedStoreSync storeId={storeId} />
              <CopilotChat
                agentId={AGENT_ID}
                className="h-full"
                labels={{
                  chatInputPlaceholder: C.placeholder,
                  welcomeMessageText: C.welcome,
                  chatDisclaimerText: C.disclaimer,
                }}
              />
            </CopilotKit>
          </div>
        ) : (
          <EmptyState title={copy.chat.pickStoreTitle} text={copy.chat.pickStoreText} />
        )}
      </Card>
    </section>
  );
}
