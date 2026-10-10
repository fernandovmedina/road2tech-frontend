# StockCopilot — Frontend

Hackatec / Road2Tech project. Next.js (App Router) + TypeScript + Tailwind CSS.

This repository also contains **`copilot-api/`**, the Python service (FastAPI + LangGraph + Gemini)
that powers the chat. See [`copilot-api/README.md`](copilot-api/README.md).

## Copilot chat (`/copilot`)

A chatbot that **generates interface components**: every answer from the agent arrives as a typed
tool result that the UI renders as a card with charts (trend + forecast, baseline vs. strategy
simulation, restock list with supplier email, store KPIs, demand by branch, weekly plan). When the
agent proposes a promotion, the run pauses and an **approval card** appears; nothing is activated
without the store manager.

Stack: CopilotKit v2 (`@copilotkit/react-core/v2`, `@copilotkit/runtime/v2`) over **AG-UI** to a
LangGraph agent in Python. Charts use Recharts.

```
app/copilot/page.tsx                 Chat page
app/api/copilotkit/[[...slug]]/      CopilotKit runtime → Python agent (POST {COPILOT_API_URL}/copilot)
app/api/backend/[...path]/           Same-origin proxy to the Copilot API REST endpoints
components/copilot/                  Workspace, tool renderers, cards, charts, approval card
lib/copilot/  lib/api/  types/       Formatting, parsing, typed API client, contracts
```

## Run

```bash
# 1. Copilot API (Python) — see copilot-api/README.md
cd copilot-api && uv sync && cp .env.example .env   # set DATASET_DIR and optionally GOOGLE_API_KEY
uv run python -m stockcopilot                        # http://localhost:8000

# 2. Frontend
cd .. && pnpm install
cp .env.example .env.local                           # COPILOT_API_URL=http://localhost:8000
pnpm dev                                             # http://localhost:3000/copilot
```

Checks: `pnpm lint`, `npx tsc --noEmit`, and `uv run pytest` inside `copilot-api/`.
