// CopilotKit runtime (v2). The browser talks to this route; it forwards each run over AG-UI
// to the LangGraph agent served by the Python Copilot API (`POST /copilot`).
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import { CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";

const COPILOT_API_URL = process.env.COPILOT_API_URL ?? "http://localhost:8000";

const runtime = new CopilotRuntime({
  agents: {
    default: new LangGraphHttpAgent({ url: `${COPILOT_API_URL}/copilot` }),
  },
});

const handler = createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit" });

export const GET = handler;
export const POST = handler;
