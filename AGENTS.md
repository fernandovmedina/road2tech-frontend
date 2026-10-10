# StockCopilot — Frontend Guide (AGENTS.md)

Context file for opencode. Read this fully before touching code.

## 1. Scope

Hackatec hackathon project. **My part is ONLY the interface (frontend)**, which lives in its own folder, separate from the backend. Stay inside the frontend folder.
- Do NOT build the real model, agent, or backend. Everything the UI needs comes from a typed data layer (`/lib/api`) that returns **mock data now** and can be swapped for real endpoints later without touching components.
- Priority: a polished, demo-ready UI that tells a clear story in ~3 minutes. Speed over perfection; no over-engineering.

## 2. Product summary

**StockCopilot** helps store managers reduce losses (stock-outs, overstock, unsold products) and increase sales (cross-sells, promotions).

Three pieces:

| Piece | What it is | UI surface |
|---|---|---|
| **Model** | Predictions from sales behavior + events | Dashboard (KPIs, trends, demand by branch, demand map) |
| **Agent** | Actionable part: restock + promotions | Restock suggestions (list + calendar), promo suggestions on map |
| **User** | Store manager (the person in charge of the stores) | The person using all of the above |

**User value:**
1. Dashboard of trends/predictions, alerts, and possible promotions to avoid losses.
2. Restock agent with calendar (**GenUI**: the agent proposes UI blocks, e.g. a restock card with an "approve / send email" action).
3. Demand map for a product (focused on general/national view, drill down by branch).

## 3. Suggested stack (confirm/adjust if the repo already has one)

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts (line/area charts, dashed segment = forecast)
- Leaflet (react-leaflet) for the demand map, centered on Mexico
- TanStack Query for data fetching over the mock layer
- Zustand or React state for filters (keep it simple)

If the repo already uses something else, **follow the repo, not this list**.

## 4. Language & conventions

- **Everything is in English and standardized: UI copy (labels, buttons, errors, toasts, placeholders), code, identifiers, comments, file names, routes, and commit messages.** No Spanish anywhere in the interface or code.
- Do not add i18n/translation libraries; hardcode English strings (a single `/lib/copy.ts` constants file is fine if it helps keep wording consistent).
- Use consistent terminology everywhere, per the glossary in section 5.5.
- Number/date formats: use `Intl` with `en-US`; currency is MXN (`$` with "MXN" label where ambiguous).
- Components in PascalCase files, hooks `useX`, one component per file, small and composable.
- Strict TypeScript, no `any`. Domain types live in `/types`.
- Responsive: desktop-first (dashboard), but must not break on tablet.
- Accessibility basics: semantic HTML, labels, contrast, keyboard focus.

## 5. Screens (from the whiteboard)

### 5.0 Login — route `/login`

Entry point of the app. The user is the store manager.

- Centered card with the StockCopilot logo/name, a short tagline, and a form: **Email** + **Password** (show/hide password toggle) and a **"Sign in"** button.
- Client-side validation (valid email, non-empty password) with clear error messages in English; error state for wrong credentials; loading state on the button while submitting.
- Optional: "Forgot your password?" link (can be a non-functional placeholder).
- **Auth is mocked for now.** Implement `login(email, password)` and `logout()` in `/lib/api/auth.ts` (any non-empty valid-looking credentials succeed, or use one demo account such as `demo@stockcopilot.com` / `demo1234`). Keep the session in a small auth provider (React context) persisted in `localStorage`, shaped so a real token from the backend can replace it later (`// TODO(backend): real auth endpoint`).
- **Route protection:** every route except `/login` redirects to `/login` when there is no session (Next.js middleware or a client-side guard). If already logged in, `/login` redirects to `/`.
- After login, redirect to the Dashboard. The top bar/sidebar shows the user's name and a **"Sign out"** button.
- Visual style consistent with the rest of the app; a subtle retail/analytics illustration or gradient on the side is a nice-to-have on desktop.

### 5.1 Dashboard (Model) — route `/`

Header controls:
- **"View data"** toggle: `Current` | `Trend`
- **"Period"**: date range picker (from – to)

**KPI cards (top row):**
- **Total sales** (sales total for period)
- **Run-outs** (stock-outs) — e.g. `10`
- **No demand** (products with no demand) — e.g. `5`

**Section: "Analyze demand and products by branch"**
- Left: scrollable list of products/branches. Tabs: `Products` | `Promotions`. Each row: name, mini trend arrow (up/down), value.
- Controls: **Sort** and **Filter by category**.
- Right: line chart of the selected row — solid line = history, **dashed = prediction**. Button **"Back to map"** returns to the demand map view.
- Footnote text: predictions are based on sales-behavior trends + events.

**Bottom bar:** `View stock suggestions [VIEW]` → navigates to `/agent`.

### 5.2 Restock suggestions (Agent) — route `/agent`

Header tag: **"Suggestion"**. Two views switchable: **Restock list** | **Calendar**.

- **Left sidebar:** supplier catalog (**Supplier catalog, with email**). Each supplier shows name + email.
- **Main area:** restock suggestions as cards/chips; in calendar mode, a week/month grid with suggested restock dates (the row of circles on the board = calendar days/slots with items below).
- Each suggestion explains **why**, based on: stock limit, demand, season (`Stock limit`, `Demand`, `Season`).
- Primary action (the actionable part): approve suggestion → prepare/send email to the supplier. Mock this with a confirmation modal + toast.
- Helper text: "Helps you reduce losses."
- Small chart thumbnail per suggestion (demand curve) is a nice-to-have.

### 5.3 Demand map + promotions — route `/map` (or section inside `/agent`)

- Map of Mexico with demand per region/branch (heat/choropleth or sized markers).
- Right panel: **Product + Demand** (selected product, demand figure) and **Suggested promotions** (list of suggested promos / cross-sells).
- Goal: increase sales and cross-sells, based on: demand, weather (`Weather`), events (`Events`), seasons (`Seasons`).
- Clicking a region updates the right panel. "Back to map" from the dashboard lands here.

### 5.4 Navigation

Simple top bar or sidebar: `Dashboard` · `Restock` · `Map`, plus the user's name and **Sign out** (hidden on `/login`). Keep state (period, category filter) when moving between screens.

### 5.5 Glossary (use these exact terms in UI and code)

| Concept | UI label | Code name |
|---|---|---|
| Stock-out | Run-outs | `runOuts` |
| Products with no demand | No demand | `noDemand` |
| Branch / store location | Branch | `branch` |
| Restock suggestion | Suggestion | `RestockSuggestion` |
| Supplier catalog | Supplier catalog | `Supplier` |
| Suggested promotions | Suggested promotions | `PromoSuggestion` |
| Demand map | Demand map | `DemandByRegion` |

## 6. Data contracts (mock first)

Put in `/types` and implement mocks in `/lib/mock`, served by `/lib/api`:

```ts
type AuthUser = { id: string; name: string; email: string };

type Session = { user: AuthUser; token: string };

type Branch = { id: string; name: string; lat: number; lng: number };

type Product = { id: string; name: string; category: string };

type KPI = { totalSales: number; runOuts: number; noDemand: number };

type TrendPoint = { date: string; value: number; isForecast: boolean };

type ProductRow = {
  productId: string;
  branchId: string;
  trend: "up" | "down" | "flat";
  demand: number;
  series: TrendPoint[];
};

type Supplier = { id: string; name: string; email: string };

type RestockSuggestion = {
  id: string;
  productId: string;
  branchId: string;
  supplierId: string;
  suggestedQty: number;
  suggestedDate: string; // ISO
  reasons: ("stock_limit" | "demand" | "season")[];
  status: "pending" | "approved" | "dismissed";
};

type PromoSuggestion = {
  id: string;
  productId: string;
  title: string;
  kind: "promo" | "crosssell";
  drivers: ("demand" | "weather" | "event" | "season")[];
};

type DemandByRegion = { regionId: string; productId: string; demand: number };
```

Rule: components never import mock data directly — always through `/lib/api` hooks, so the real backend can replace it.

## 7. Suggested structure

Paths below are relative to the frontend folder.

```
app/
  login/page.tsx      # Login (public)
  page.tsx            # Dashboard
  agent/page.tsx      # Restock list + calendar
  map/page.tsx        # Demand map + promos
components/
  dashboard/  agent/  map/  ui/
lib/
  api/  mock/
types/
```

## 8. UI/UX direction

- Clean, professional retail-analytics look: lots of whitespace, one accent color, clear red/amber/green semantics for alerts (run-outs = red, low demand = amber).
- Cards with soft borders, rounded corners; charts are the visual hero.
- Always handle **loading, empty, and error** states (skeletons, not spinners).
- Forecast = dashed line + lighter fill, with a legend.
- Include a believable demo dataset (Mexican retail products and cities, with English product/category names) so the demo looks real.

## 9. How to work with me

- Frontend is **not my specialty**, and this is a hackathon: **you write the code**. Implement features end to end (files, components, styles, mock data) instead of giving me instructions to follow.
- Make reasonable decisions on your own (layout, component structure, libraries from the stack above) and keep moving. Only ask me when something truly blocks you.
- Explain what you did in plain language, short and without frontend jargon. If you pick a non-obvious approach, say why in one line.
- Before large changes (new dependency, restructuring), give me the plan in 3–5 bullets, then proceed unless I object.
- Run the dev server / type-check / lint after changes and fix errors yourself.
- The repo has **separate folders for backend and frontend**. Work **only inside the frontend folder**. Never edit the backend folder; if something is missing from the API, add a typed mock and leave a `// TODO(backend):` comment.

## 10. Definition of done (per screen)

- [ ] Matches the layout described above
- [ ] Uses typed mock data via `/lib/api`
- [ ] Loading / empty / error states
- [ ] English everywhere (UI copy and code), terminology matches the glossary
- [ ] No console errors, `tsc` and lint pass
- [ ] Looks good at 1440px and 1024px widths
- [ ] Login works with mock auth; protected routes redirect to `/login`; logout clears the session