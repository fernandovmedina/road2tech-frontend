## Why

StockCopilot has approved mockups and a product definition (`proyect_context/`, `AGENTS.md`) but no interface yet. The hackathon demo needs an interactive, demo-ready UI that tells the full story (detect → simulate promotion → restock → approve) in ~5 minutes. The backend, model and DB schema are still undefined and will change, so the UI must be built now on top of a typed, swappable mock data layer.

## What Changes

- Build all 7 screens from the approved mockups on Next.js (App Router) + React + TypeScript + Tailwind v4: Login, Dashboard, Product detail / promotion simulator, Restock calendar, Stock, Suppliers, Products.
- Add an app shell (fixed sidebar, protected routes, mocked session in `localStorage`, shared filters for branch / data mode / date range that persist across screens).
- Add a typed mock data layer (`/types`, `/lib/mock`, `/lib/api` with TanStack Query hooks) with simulated latency, plus a trigger for empty and error states. Components never import mocks directly, so real endpoints replace them without touching UI.
- Implement complete interactive flows with modals and confirmations: accept/dismiss promotion (schedules it in calendar), "Orden Restock" modal with mocked email send, supplier edit + test email, min/max AI suggestions, GenUI chatbot with canned replies.
- Centralize all Spanish UI copy in `/lib/copy.ts`; code stays in English; `es-MX` / MXN formatting; "Datos de ejemplo" badge on every screen.
- Routing decision: the request mentioned React Router, but the repo is Next.js and `AGENTS.md` says to follow the repo. Routing uses the **Next.js App Router** (file-based, with a client-side route guard). React Router is not added. Rationale is recorded in `design.md`.
- Remove the empty placeholder files in `app/(auth)/`.
- Non-goals: real model, agent, backend, real auth, real email sending, i18n library, final data contracts (they are provisional and expected to change).

## Capabilities

### New Capabilities
- `app-shell-auth`: Mock login, session context, protected-route redirects, sidebar navigation, persistent shared filters, Datos de ejemplo badge, loading/empty/error conventions.
- `mock-data-layer`: Typed domain models, mock datasets, simulated latency, query hooks, and the promotion math; the single seam for a future backend.
- `dashboard-overview`: Dashboard header controls, 4 KPI cards, detected purchase behaviors.
- `branch-analysis`: Leaflet heatmap with branch filtering and product search, plus the Productos / Promociones sidebar tabs.
- `ai-assistant-chat`: GenUI chatbot rendering trend charts and restock tables from canned tool replies.
- `product-promo-simulator`: Product detail trend chart, discount slider, with/without scenario comparison, accept/dismiss flow.
- `restock-calendar`: Month calendar, product/supplier sidebar, Orden Restock modal with mocked send.
- `stock-overview`: Stock table with filters, status chips, count cards and level bars.
- `supplier-catalog`: Supplier table, edit form, test email card.
- `product-catalog`: Product table with editable min/max and AI-suggested min/max.

### Modified Capabilities
<!-- None: openspec/specs/ is empty. -->

## Impact

- New code under `app/`, `components/`, `lib/`, `types/`; removes `app/(auth)/*` placeholders; updates `app/layout.tsx` (font, providers).
- New dependencies (plan to confirm in design): `recharts`, `leaflet` + `react-leaflet` (+ heat plugin or radial markers), `@tanstack/react-query`, optionally `zustand`.
- No backend, API or infra changes. Data contracts in `AGENTS.md` §8 are treated as provisional; the `/lib/api` boundary isolates the UI from their future changes.
