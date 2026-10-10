## 1. Foundation

- [ ] 1.1 Delete empty placeholders in `app/(auth)/`; install `recharts`, `leaflet`, `react-leaflet`, `@types/leaflet`, `@tanstack/react-query`, `zustand` with pnpm
- [ ] 1.2 Add design tokens to Tailwind v4 theme (colors, radii, heat gradient) and load Manrope with tabular numerals in `app/layout.tsx`
- [ ] 1.3 Create `lib/copy.ts` and `lib/format.ts` (es-MX currency, number, date, percent)
- [ ] 1.4 Build UI primitives in `components/ui`: Button, Card, Badge, Modal (native dialog), Select, Tabs, Skeleton, Toast, EmptyState, ErrorState, SampleDataBadge

## 2. Types and mock data layer

- [ ] 2.1 Define domain types in `types/` per AGENTS.md §8 (provisional)
- [ ] 2.2 Create mock datasets in `lib/mock` (7 branches, 10 products, 5 suppliers, stock covering all statuses, trends, promotions, restock suggestions, calendar events, behaviors)
- [ ] 2.3 Implement `simulatePromo` and optimal-discount search; verify the yogurt promotion is the single source for all screens
- [ ] 2.4 Implement mutable mock store (sessionStorage, versioned) with latency helper and forced empty/error demo mode
- [ ] 2.5 Implement `lib/api` functions and TanStack Query hooks per resource with `TODO(backend)` markers; add QueryClient provider

## 3. Shell and auth

- [ ] 3.1 Implement `lib/api/auth.ts` (`login`, `logout`), session context with localStorage, and profile-based branch scoping
- [ ] 3.2 Build `/login` split screen with validation, loading and wrong-credentials states
- [ ] 3.3 Build authenticated layout: fixed sidebar, active item, user/role, logout, demo-state control, client route guard with hydration gate
- [ ] 3.4 Implement shared filters store (branch, data mode, range) with URL deep-link params for calendar

## 4. Dashboard

- [ ] 4.1 Header controls (Sucursal, Datos toggle, range) wired to filters
- [ ] 4.2 Four KPI cards with skeleton, delta and dark AI opportunity card
- [ ] 4.3 Detected behaviors cards with "Ver predicción" and "Ver en calendario"
- [ ] 4.4 Branch heatmap (dynamic import, radial markers), branch click filter, product autocomplete with ★ and "Quitar filtro"
- [ ] 4.5 Sidebar tabs Productos/Promociones with category chips, sort and row actions
- [ ] 4.6 AI assistant chat with canned replies, trend chart and restock table blocks, tool labels, typing indicator and approval flow

## 5. Product detail and simulator

- [ ] 5.1 `/product/[id]` trend chart (history, forecast, promo forecast, uncertainty band, promo window) and metric tiles
- [ ] 5.2 Discount slider, optimal discount, reasons panel
- [ ] 5.3 Si no aceptas / Si aceptas cards and comparison table with differences
- [ ] 5.4 Accept (confirm modal, schedules in calendar), Dismiss, Ver en calendario; not-found state

## 6. Restock calendar

- [ ] 6.1 Month grid with colored events, today highlight, month navigation, branch select, deep-link highlight
- [ ] 6.2 Sidebar tabs Productos/Proveedores with tags, suggestions, top promotions and supplier summaries
- [ ] 6.3 Orden Restock modal with editable qty, cost, with/without comparison, min-order warning
- [ ] 6.4 Mocked "Enviar correo con Resend" flow with sending and confirmation states; update order status and calendar

## 7. Stock, Suppliers, Products

- [ ] 7.1 `/stock`: filters, status chips, count cards, table with level bars and "Ver en calendario"; status derived from catalog min/max
- [ ] 7.2 `/suppliers`: table, edit/add form with validation, Resend card with test email
- [ ] 7.3 `/products`: catalog table with search/filter, editable min/max with validation and save
- [ ] 7.4 "Sugerir min/max con IA" with per-row reasons and "Aplicar sugerencias"

## 8. Polish and verification

- [ ] 8.1 Loading skeleton, empty and error states on every screen; "Datos de ejemplo" badge everywhere
- [ ] 8.2 Check 1440px and 1024px layouts and phone wrap; keyboard focus, labels, aria-labels
- [ ] 8.3 Verify cross-screen consistency (promotion gain on Dashboard/Product/Calendar) and that filters change numbers
- [ ] 8.4 Run `tsc` and lint, fix errors; run dev server and walk the full demo story with no console errors
