import { apiMode, chatAnalysisSource, isForcedLivePath } from "./config";

// Endpoints the deployed backend (BackendRoad2Tech/api, Go Lambdas over DynamoDB) already serves. Used by the
// "hybrid" mode: these go to the real API, everything else keeps answering from lib/mock.
// /chat is deliberately absent: it will be replaced by the LangGraph + CopilotKit agent (openspec change
// integrate-copilot-agent-chat), so it keeps answering from the mock. To try the deployed Lambda anyway, list it in
// NEXT_PUBLIC_API_HTTP_PATHS (config.ts): those prefixes are live in any mode.
// Still mock (not deployed): tendency, plan, strategies:generate and drafts/* (the M0 endpoints).
// The demand map (components/opportunities) reads /predictions/* through lib/api/storeDemand.ts, which keeps its own
// demo generator in mock mode.
// Verified against the live API on 2026-10-10; when the backend ships another endpoint, add it here
// (or switch to NEXT_PUBLIC_API_MODE=http once all of docs/backend-contract.md exists).

type Method = "GET" | "POST" | "PUT" | "DELETE";

const LIVE: { method: Method; re: RegExp }[] = [
  { method: "GET", re: /^\/meta$/ },
  { method: "GET", re: /^\/stores$/ },
  { method: "GET", re: /^\/chain\/summary$/ },
  { method: "GET", re: /^\/stores\/[^/]+\/kpis$/ },
  { method: "GET", re: /^\/predictions\/stores$/ },
  { method: "GET", re: /^\/stores\/[^/]+\/predictions\/products$/ },
  { method: "GET", re: /^\/heat$/ },
  { method: "GET", re: /^\/stores\/[^/]+\/behaviors$/ },
  { method: "GET", re: /^\/stores\/[^/]+\/stock$/ },
  { method: "GET", re: /^\/stock\/summary$/ },
  { method: "GET", re: /^\/stores\/[^/]+\/stock-policy$/ },
  { method: "PUT", re: /^\/stores\/[^/]+\/stock-policy$/ },
  { method: "POST", re: /^\/auth\/(signin|logout)$/ },
  { method: "POST", re: /^\/stores\/[^/]+\/stock-policy:suggest$/ },
  { method: "GET", re: /^\/stores\/[^/]+\/restock-suggestions$/ },
  // POST /emails sends to a recipient chosen in the UI. /restock-orders and /suppliers/{id}/test-email stay off this
  // list on purpose: they mail the supplier's own address unless the Lambda has DEMO_MAILBOX set.
  { method: "POST", re: /^\/emails$/ },
  { method: "GET", re: /^\/stores\/[^/]+\/calendar$/ },
  { method: "GET", re: /^\/suppliers$/ },
  { method: "GET", re: /^\/suppliers\/[^/]+\/offers$/ },
  { method: "GET", re: /^\/products$/ },
];

/** True when this call must reach the real backend in the current mode. */
export function isLiveRoute(method: Method, path: string): boolean {
  // Frontend-side adapters are answered by lib/mock until the backend ships them (the product comparison through the
  // app/api/market-comparison route), whatever the mode. Listing their path in NEXT_PUBLIC_API_HTTP_PATHS sends them to the backend.
  if (path === "/assistant/product-comparison" || (path === "/assistant/analysis" && chatAnalysisSource === "compat")) {
    return isForcedLivePath(path);
  }
  if (apiMode === "http" || isForcedLivePath(path)) return true;
  if (apiMode === "mock") return false;
  return LIVE.some((r) => r.method === method && r.re.test(path));
}
