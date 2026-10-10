# StockCopilot Copilot API

Python service behind the StockCopilot chat. It answers store-manager questions with **generative UI**:
each answer is a typed JSON component (trend chart, strategy simulation, restock list, approval card)
that the Next.js frontend renders inside the chat.

- **FastAPI**: REST endpoints (contract from `BackendRoad2Tech/milestones.md`) + the AG-UI endpoint.
- **LangGraph**: explicit copilot graph with human approval (`interrupt`) and checkpoints.
- **Gemini** (Google AI Studio key) through `langchain-google-genai`. Without a key it runs **offline**
  (keyword intent parser + templated answers), so the demo and the tests work with no network.
- **Data**: the Road2Tech **v2** dataset (`dataset-hackathon-road2tech/v2`), read from the CSV folder
  or from **PostgreSQL**.
- **AWS Lambda** for the short REST operations (`lambda_handler.py`, `template.yaml`); the agent runs
  as a persistent container (it streams and resumes approvals).

> Principle (from `ARCHITECTURE.md`): deterministic code produces every number; the LLM only reads
> intent, picks tools and explains results. The agent can only create **drafts**; approving a
> promotion always needs an explicit user action.

## Architecture

```
Next.js /copilot (CopilotKit v2 chat + tool renderers + approval card)
   │  AG-UI over /api/copilotkit (CopilotKit runtime, LangGraphHttpAgent)
   ▼
Copilot API (FastAPI)
   ├── POST /copilot ─────────── LangGraph copilot graph
   │                               agent (Gemini) ⇄ tools → track_drafts → agent
   │                               └─ approval (interrupt) → draft approved / rejected / kept
   ├── REST /stores/... /drafts/... (also deployable as Lambda behind API Gateway)
   │
   ├── get_product_tendency ──── history (v2 sales) + forecast P50/P80/P90 + trend + risks
   ├── get_product_sell_strategy  deterministic LangGraph pipeline:
   │      get_current_store_context → get_demand_forecast → get_historical_insights
   │      → get_business_constraints → generate_strategy_candidates → simulate_strategy
   │      → validate_strategy → select_strategy → create_promotion_draft
   ├── get_restock_suggestions ── best-supplier rule from the dataset (lead time, MOQ, reliability)
   ├── get_store_overview / get_demand_by_store / generate_store_plan / search_products
   │
   └── DataRepository: CsvRepository (v2 folder) | PostgresRepository (schema.sql)
       DraftStore: in-memory | PostgreSQL (promotion_drafts)
       Checkpointer: memory | PostgreSQL (AsyncPostgresSaver)
```

Mapping to the AWS design in `BackendRoad2Tech/ARCHITECTURE.md`:

| AWS component | Here (MVP) | Swap later |
|---|---|---|
| Athena / S3 Curated | `DataRepository` (CSV or PostgreSQL) | an Athena adapter implementing the same protocol |
| SageMaker forecast | `domain/forecast.py` (seasonal baseline, P50/P80/P90) | adapter returning `ForecastResult` |
| Decision engine Lambda | `domain/strategy/*` + `domain/restock.py` | same code in Lambda |
| DynamoDB drafts | `DraftStore` (memory / PostgreSQL) | DynamoDB store with the same methods |
| Bedrock (ChatBedrockConverse) | Gemini (`ChatGoogleGenerativeAI`) | change `agent/llm.py` only |
| AgentCore Runtime | Dockerfile (port 8080, `/ping`, `/invocations`) | deploy the same image |

## Run locally

```bash
cd copilot-api
uv sync                                   # Python 3.12+
cp .env.example .env                      # set DATASET_DIR (and GOOGLE_API_KEY for Gemini)
uv run python -m stockcopilot             # http://localhost:8000  (docs at /docs)
```

`DATASET_DIR` must point to `BackendRoad2Tech/public/softtek/dataset/dataset-hackathon-road2tech/v2`.
The CSV adapter loads the 3M sales rows into memory in ~2 s.

Then start the frontend from the repository root (`pnpm dev`) and open http://localhost:3000/copilot.

### With PostgreSQL

```bash
python -m stockcopilot.data.load_postgres --dataset-dir <v2 folder> --database-url postgresql://...
DATA_BACKEND=postgres CHECKPOINTER=postgres DATABASE_URL=postgresql://... uv run python -m stockcopilot
```

or everything at once: `DATASET_DIR=<abs v2 path> docker compose up --build` (API on port 8000).

## Endpoints

Success bodies are `{request_id, data_as_of, data}`; errors are `{code, message, request_id}`.

| Method | Path | What it does |
|---|---|---|
| GET | `/health`, `/ping` | Health checks (`/ping` for AgentCore) |
| GET | `/meta` | Data range, demo date, data backend, LLM in use |
| GET | `/stores`, `/products?q=&category_id=`, `/categories`, `/suppliers` | Catalog |
| GET | `/stores/{store_id}/overview?period_days=` | KPIs (sales, run-outs, no demand), movers, alerts |
| GET | `/stores/{store_id}/tendency?product_id=&history_days=&forecast_days=` | `get_product_tendency` (Gemini writes `ai_summary` when configured) |
| GET | `/stores/{store_id}/restock?product_id=&limit=` | Restock suggestions with supplier email draft |
| GET | `/products/{product_id}/demand-by-store?days=` | Demand of one product across the 25 branches |
| POST | `/stores/{store_id}/strategies:generate` | Automatic plan: up to 5 compatible strategies (drafts) |
| POST | `/stores/{store_id}/strategies:prompt` | `get_product_sell_strategy` from fields or a natural-language `prompt` |
| GET | `/drafts?store_id=&status=`, `/drafts/{draft_id}` | Promotion drafts |
| POST | `/drafts/{draft_id}/add-to-plan` \| `/approve` \| `/reject` | State machine `draft → selected → approved`, `→ rejected` |
| GET | `/stores/{store_id}/plan?from=&to=` | Selected/approved strategies in a period |
| POST | `/copilot` (and `/invocations`) | AG-UI stream of the LangGraph copilot (used by CopilotKit) |

## Tests and lint

```bash
uv run pytest            # 30 tests on a small v2 fixture (tests/fixtures/v2)
uv run ruff check src tests && uv run ruff format --check src tests
```

The fixture is a 2-store × 6-product slice of v2 built with `scripts/make_fixture.py`.

## Modeling notes and limits

- **Dataset v2 is clean**: full date × store × product grid, no duplicates, no negative units, all
  foreign keys valid. (The quality issues listed for the first dataset do not apply to v2.) Stock on
  hand is rebuilt exactly from lots, sales and expirations.
- **Forecast**: multiplicative baseline (weekday × calendar hint × weather × level) with quantiles
  from the generator's demand noise. It is a stand-in for SageMaker; its 14-day backtest WAPE is
  shown in every trend card.
- **Uplift**: v2 has no promotion history and no tickets, so price response uses an assumed
  elasticity per category and combos use **business-rule** category pairs ("synthetic affinity").
  Results are labeled as simulations, with a 60%–140% effect range.
- **Simulation**: FEFO inventory day by day, orders in transit and the store's usual reorder rule in
  both scenarios; net impact = margin increment + value of waste avoided.
