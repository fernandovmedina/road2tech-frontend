# StockCopilot — Frontend

Hackatec / Road2Tech project. Next.js (App Router) + TypeScript + Tailwind CSS.

The Python service that powers the chat (FastAPI + LangGraph + Gemini, REST endpoints and the AWS
Lambda) lives in the backend repository:
[`BackendRoad2Tech/services/copilot-api`](https://github.com/FerGem33/BackendRoad2Tech/tree/main/services/copilot-api).

## Copilot chat (`/copilot`)

A chatbot that **generates interface components**: every answer from the agent arrives as a typed
tool result that the UI renders as a card with charts (trend + forecast, baseline vs. strategy
simulation, restock list with supplier email, store KPIs, demand by branch, weekly plan). When the
agent proposes a promotion, the run pauses and an **approval card** appears; nothing is activated
without the store manager.

Stack: CopilotKit v2 (`@copilotkit/react-core/v2`, `@copilotkit/runtime/v2`) over **AG-UI** to the
LangGraph agent. Charts use Recharts.

```
app/copilot/page.tsx                 Chat page
app/api/copilotkit/[[...slug]]/      CopilotKit runtime → agent (POST {COPILOT_API_URL}/copilot)
app/api/backend/[...path]/           Same-origin proxy to the Copilot API REST endpoints
components/copilot/                  Workspace, tool renderers, cards, charts, approval card
lib/copilot/  lib/api/  types/       Formatting, parsing, typed API client, contracts
```

## Run

1. Start the Copilot API from the backend repository (see its `services/copilot-api/README.md`);
   it listens on http://localhost:8000.
2. Start the frontend:

```bash
pnpm install
cp .env.example .env.local      # COPILOT_API_URL=http://localhost:8000
pnpm dev                        # http://localhost:3000/copilot
```

Checks: `pnpm lint`, `npx tsc --noEmit`, `pnpm build`.
