## Context

The repo is a fresh Next.js (App Router) + React + TypeScript + Tailwind v4 + pnpm scaffold. Product scope, design tokens, glossary and provisional data contracts live in `AGENTS.md` and `proyect_context/`; approved mockups are in `proyect_context/ui/`. Backend, model and DB schema are not defined and will change, so this change builds only the interface on mock data. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Pixel-faithful, interactive screens with complete flows (modals, confirmations, mutations visible across screens).
- A data seam (`/lib/api`) that lets the real backend replace mocks with no component changes.

**Non-Goals:**
- Real model, agent, auth, email, persistence beyond the browser session.
- Finalizing data contracts; they are provisional.
- SSR data fetching or SEO; the app is a client-rendered authenticated tool.

## Decisions

**1. Next.js App Router for routing, not React Router.** The request mentioned React Router, but the repo is Next.js and `AGENTS.md` says to follow the repo. Next provides file-based routes (`/login`, `/`, `/product/[id]`, `/calendar`, `/stock`, `/suppliers`, `/products`) and layouts for the shell. Running React Router inside Next would duplicate routing and fight the framework. Alternative: Vite + React Router SPA; rejected because it means abandoning the scaffold and gains nothing for the demo. If the team truly wants React Router, this is the one decision to revisit before apply.

**2. Client-side route guard.** Auth is a `localStorage` session in a React context, so guarding happens in a client layout wrapper (redirect via `useRouter` once the session is read) rather than middleware. Render nothing/skeleton until the session is hydrated to avoid flashes. Alternative: cookie + middleware; deferred to the real auth endpoint (`TODO(backend)`).

**3. Data layer shape.** `/types` holds domain types; `/lib/mock` holds datasets and pure functions (e.g. promotion math); `/lib/api` exposes async functions (with 300–600 ms latency) and TanStack Query hooks (`useKpis`, `useStockItems`, `useUpdateSupplier`, …). Components only import hooks from `/lib/api`. Mutable mock state (accepted promotions, sent orders, edits) lives in a module-level store inside `/lib/mock` persisted to `sessionStorage`, and mutations invalidate queries so other screens update. Alternatives: MSW (more setup, useful later); direct fetch to a mock server (extra process). A thin `api` module per resource keeps swapping to `fetch` to one file per resource. Contract drift is absorbed by mapping functions in `/lib/api`.

**4. Shared filters in a small Zustand store** (branch, data mode, range), mirrored to the URL query for deep links where cheap. Zustand over context to avoid provider re-render churn; it is tiny. Deep links to the calendar (`?date=&event=`) use URL params.

**5. Promotion math is one pure function** `simulatePromo(product, stock, discount)` used by slider, scenario cards, chart forecast line, and optimal-discount search (0–40, step 1), per the formula in `AGENTS.md` §9. Guarantees numbers agree everywhere.

**6. Charts with Recharts; map with react-leaflet.** Leaflet requires `window`, so map components load via `next/dynamic` with `ssr: false`. Heat is rendered with radial `CircleMarker`s sized/colored by the heat gradient first (no plugin risk); a heat plugin is optional later. OSM tiles need internet; a muted tile style matches the palette.

**7. Design tokens in Tailwind v4 `@theme`** (colors, radius, Manrope via `next/font`), taken from `AGENTS.md` §5. Small hand-built UI primitives in `components/ui` (Button, Card, Badge, Modal, Select, Skeleton, Tabs, Toast) instead of shadcn, to avoid setup cost; Modal uses the native `<dialog>` for focus trapping and Escape handling.

**8. Copy and formatting.** All strings in `lib/copy.ts` (keyed objects, grouped per screen); `lib/format.ts` wraps `Intl` `es-MX` for currency, numbers, dates, percents.

**9. Demo state triggers.** A small "Estados de demo" control (in the sidebar footer) toggles forced empty/error mode in the mock layer, so evaluators can show those states.

**10. Dependencies to add:** `recharts`, `leaflet`, `react-leaflet`, `@types/leaflet`, `@tanstack/react-query`, `zustand`. Confirm versions compatible with the installed React/Next before installing.

## Risks / Trade-offs

- Contracts change later → all access goes through `/lib/api` hooks and mapping functions; UI never touches raw backend shapes.
- Leaflet SSR/Strict Mode issues → dynamic import with `ssr: false`, test in dev.
- Tile server unavailable offline at the demo → fall back to a plain background with markers if tiles fail.
- Large scope for 24h → build order puts the story path first (shell → Dashboard → Product detail → Calendar), then Stock/Suppliers/Products.
- Hydration flicker from `localStorage` session → gate rendering until hydrated.
- Mock state persisted in `sessionStorage` can go stale after dataset changes → version key; offer reset in the demo control.

## Open Questions

- Whether to adopt a heat plugin for Leaflet (visual polish only; does not change tasks).
