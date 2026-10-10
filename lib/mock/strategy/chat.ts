import { restockSuggestionSchema } from "@/lib/api/schemas";
import { displayBranchName } from "@/lib/branding";
import { detectAnalysisIntent } from "@/lib/chatIntent";
import { t } from "@/lib/labels";
import type { ChatResponse, ChatTool, Strategy } from "@/types";
import { MockHttpError } from "../errors";
import type { RawProduct, StockRow } from "../db";
import { loadCtx, type Ctx } from "./context";
import { evaluateSpec, rescueSpecFor, waste_horizon_days, type Evaluated, type Spec } from "./engine";
import { allStrategies, generationOf, saveChatDraft } from "./plan";
import { computePortfolio, isLive, overlapsOf, planOverlaps } from "./portfolio";
import { buildTendency, liveStrategyFor } from "./tendency";
import { addDays, datesBetween, dayLabel, diffDays, dm, hashId, mxn, n1, norm, pct0, r2, weekdayEn, weekdayEs } from "./util";

// Mock of POST /chat (the LangGraph agent). Rule-based intent detection over the Spanish message; the answer is a
// list of GenUI blocks plus the tools the "agent" ran. The chat proposes drafts only: it never approves anything.

type Constraints = NonNullable<ChatResponse["interpreted_constraints"]>;

const EXAMPLES = [
  "¿Cuál es la tendencia de Coca-Cola 600 ml?",
  "¿Qué debo pedir esta semana?",
  "¿Cuál es el mejor plan de promociones para esta tienda?",
  "Aumenta las energéticas el sábado, máximo 10 % de descuento",
];


let counter = 0;

/* ---------- product / constraint parsing ---------- */

type Group = { re: RegExp; cat: string; name?: RegExp; label: string };
const GROUPS: Group[] = [
  { re: /energetic|energy/, cat: "C01", name: /energy|red bull|monster|volt/i, label: "bebidas energéticas" },
  { re: /refresc|soda|gaseosa/, cat: "C01", name: /cola|pepsi|sprite|fanta|squirt/i, label: "refrescos" },
  { re: /cerveza|chela/, cat: "C02", name: /tecate|carta blanca|indio|corona|victoria|modelo|michelob|bud light/i, label: "cervezas" },
  { re: /botana|papas|frituras|snack/, cat: "C03", label: "botanas" },
  { re: /dulce|chocolate/, cat: "C04", label: "dulces y chocolates" },
  { re: /\bcafe\b|cafes/, cat: "C06", label: "café" },
  { re: /lacteo|leche|yogur/, cat: "C07", label: "lácteos" },
  { re: /\bpan\b|panaderia|galleta/, cat: "C08", label: "panadería" },
  { re: /helado|paleta/, cat: "C10", label: "helados" },
  { re: /\bhielo\b/, cat: "C11", label: "hielo" },
  { re: /\bagua\b|aguas\b/, cat: "C01", name: /water|agua/i, label: "agua" },
  { re: /\bjugo|nectar/, cat: "C01", name: /juice|nectar|jumex|del valle|boing/i, label: "jugos" },
  { re: /fruta|verdura/, cat: "C18", label: "frutas y verduras" },
  { re: /cigarro|tabaco/, cat: "C12", label: "cigarros" },
];

const STOP = new Set(["large", "medium", "small", "pack", "pcs", "bottle", "bottles", "can", "cans", "original", "with", "and", "the", "family", "party", "size"]);

type Found = { products: RawProduct[]; categoryId: string | null; label: string | null; viaGroup: boolean; nameFiltered: boolean };

function nameTokens(p: RawProduct): string[] {
  return norm(p.product_name).split(/[^a-z0-9]+/).filter((tk) => tk.length >= 3 && !/^\d/.test(tk) && !STOP.has(tk));
}

function findProducts(ctx: Ctx, storeId: string | null, text: string): Found {
  const msg = norm(text);
  const inStore = (p: RawProduct) => storeId === null || ctx.stockByKey.has(`${storeId}|${p.product_id}`);
  for (const g of GROUPS) {
    if (!g.re.test(msg)) continue;
    const products = ctx.products.filter((p) => p.category_id === g.cat && (!g.name || g.name.test(p.product_name)) && inStore(p));
    if (products.length) return { products, categoryId: g.cat, label: g.label, viaGroup: true, nameFiltered: !!g.name };
  }
  const words = msg.split(/[^a-z0-9]+/).filter(Boolean);
  let bestScore = 0;
  let best: RawProduct[] = [];
  for (const p of ctx.products) {
    if (!inStore(p)) continue;
    const toks = nameTokens(p);
    if (!toks.length) continue;
    const matched = toks.filter((tk) => words.some((w) => w === tk || (w.length >= 4 && (tk.startsWith(w) || w.startsWith(tk))))).length;
    if (matched < Math.min(2, toks.length)) continue;
    const score = matched / toks.length;
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = [p];
    } else if (Math.abs(score - bestScore) < 1e-9) best.push(p);
  }
  if (best.length && bestScore >= 0.5) {
    const cats = new Set(best.map((p) => p.category_id));
    return { products: best, categoryId: cats.size === 1 ? best[0].category_id : null, label: null, viaGroup: false, nameFiltered: true };
  }
  return { products: [], categoryId: null, label: null, viaGroup: false, nameFiltered: false };
}

const WEEKDAYS: [RegExp, number][] = [
  [/\bdomingo/, 0], [/\blunes/, 1], [/\bmartes/, 2], [/\bmiercoles/, 3], [/\bjueves/, 4], [/\bviernes/, 5], [/\bsabado/, 6],
];
const DOW_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseWeekday(ctx: Ctx, msg: string): { weekday: string | null; start: string; end: string; label: string } {
  const pwStart = addDays(ctx.asOf, 1);
  for (const [re, dow] of WEEKDAYS) {
    if (!re.test(msg)) continue;
    const date = datesBetween(pwStart, addDays(pwStart, 6)).find((d) => DOW_EN.indexOf(weekdayEn(d)) === dow)!;
    return { weekday: DOW_EN[dow], start: date, end: date, label: `el ${weekdayEs(date)} ${dm(date)}` };
  }
  if (/fin de semana|finde/.test(msg)) {
    const sat = datesBetween(pwStart, addDays(pwStart, 6)).find((d) => weekdayEn(d) === "Saturday")!;
    return { weekday: null, start: sat, end: addDays(sat, 1), label: `el fin de semana (${dayLabel(sat)} al ${dayLabel(addDays(sat, 1))})` };
  }
  return { weekday: null, start: pwStart, end: addDays(pwStart, 2), label: `del ${dm(pwStart)} al ${dm(addDays(pwStart, 2))}` };
}

function parseMaxDiscount(msg: string): number | null {
  const m =
    /(?:maxim[oa]?|max\.?|tope|hasta|no mas de|limite)\s*(?:de\s*)?(?:un\s*)?(\d{1,2}(?:[.,]\d+)?)\s*%/.exec(msg) ??
    /(\d{1,2}(?:[.,]\d+)?)\s*%\s*(?:de\s*)?(?:descuento|maximo|max)/.exec(msg) ??
    /(\d{1,2}(?:[.,]\d+)?)\s*%/.exec(msg);
  if (!m) return null;
  const v = Number(m[1].replace(",", "."));
  return v > 0 && v <= 90 ? Math.round(v) / 100 : null;
}

/* ---------- blocks ---------- */

const text = (t: string) => ({ type: "text" as const, text: t });

async function restockBlock(storeId: string): Promise<{ type: "restock_table"; suggestions: unknown[] } | null> {
  try {
    const mod = await import("../handlers/ops");
    const route = mod.routes.find((r) => r.method === "GET" && /\/restock-suggestions$/.test(r.path));
    if (!route) return null;
    const data = (await route.handler({ params: { storeId }, query: {}, body: null, empty: false })) as unknown;
    const raw = Array.isArray(data) ? data : ((data as { items?: unknown } | null)?.items ?? []);
    if (!Array.isArray(raw)) return null;
    const ok = raw.map((x) => restockSuggestionSchema.safeParse(x)).flatMap((r) => (r.success ? [r.data] : []));
    return ok.length ? { type: "restock_table", suggestions: ok.slice(0, 5) } : null;
  } catch {
    return null;
  }
}

function planSummaryBlock(ctx: Ctx, all: Strategy[], draft: Strategy | null) {
  const current = computePortfolio(ctx, all);
  if (!draft) {
    return {
      portfolio: current,
      block: {
        type: "plan_summary" as const,
        current_net_expected_margin_increment: current.net_expected_margin_increment,
        with_draft_net_expected_margin_increment: current.net_expected_margin_increment,
        delta: 0,
        overlaps: planOverlaps(current, all),
      },
    };
  }
  const withDraft = computePortfolio(ctx, [...all.filter((s) => s.draft_id !== draft.draft_id), { ...draft, status: "selected" }]);
  return {
    portfolio: withDraft,
    block: {
      type: "plan_summary" as const,
      current_net_expected_margin_increment: current.net_expected_margin_increment,
      with_draft_net_expected_margin_increment: withDraft.net_expected_margin_increment,
      delta: r2(withDraft.net_expected_margin_increment - current.net_expected_margin_increment),
      overlaps: overlapsOf(withDraft, all, draft),
    },
  };
}

/* ---------- intents ---------- */

type Reply = { tools: ChatTool[]; constraints: Constraints | null; blocks: unknown[] };

const tool = (name: string, args: Record<string, unknown>): ChatTool => ({ name, args });

async function replyApprove(storeId: string): Promise<Reply> {
  return {
    tools: [tool("get_current_store_context", { store_id: storeId })],
    constraints: null,
    blocks: [
      text(
        "No puedo aprobar ni activar promociones desde el chat: la aprobación la haces tú desde el plan de la tienda, con confirmación. " +
          "Si te propuse un borrador, pulsa «Agregar al plan» y después «Aprobar» en su tarjeta.",
      ),
    ],
  };
}

async function replyPlan(ctx: Ctx, storeId: string, all: Strategy[]): Promise<Reply> {
  const viable = all.filter((s) => isLive(s.status)).sort((a, b) => b.expected_margin_increment - a.expected_margin_increment);
  const finalists = viable.slice(0, 5);
  const selected = finalists.slice(0, 3);
  const portfolio = computePortfolio(ctx, selected);
  const block = {
    type: "plan_summary" as const,
    current_net_expected_margin_increment: portfolio.net_expected_margin_increment,
    with_draft_net_expected_margin_increment: portfolio.net_expected_margin_increment,
    delta: 0,
    overlaps: planOverlaps(portfolio, selected),
  };
  const store = ctx.storeById.get(storeId)!;
  const tools = [
    tool("get_current_store_context", {
      store_id: storeId,
      include: ["stock", "inbound_orders", "active_promotions"],
    }),
    tool("get_demand_forecast", { store_id: storeId, horizon_days: 14, quantiles: [0.5, 0.8, 0.9] }),
    tool("get_historical_insights", {
      store_id: storeId,
      window_days: 30,
      include: ["sales", "campaign_uplift", "product_affinity", "waste"],
    }),
    tool("get_business_constraints", { store_id: storeId, include: ["margin", "stockout_risk", "offer_conflicts"] }),
    tool("optimize_portfolio", {
      store_id: storeId,
      horizon_days: 7,
      candidate_limit: 5,
      max_strategies: 3,
      objective: "maximize_margin",
    }),
  ];
  if (!selected.length)
    return { tools, constraints: null, blocks: [text(`${displayBranchName(store)} todavía no tiene estrategias en el plan. Usa «Regenerar plan» o pídeme una, por ejemplo: «${EXAMPLES[3]}».`)] };
  const top = selected.map((s, i) => `${i + 1}) ${s.title}: ${mxn(s.expected_margin_increment)}`).join("; ");
  const ci = portfolio.confidence_interval;
  const selectionText = finalists.length >= 5
    ? "El motor preseleccionó cinco promociones viables y conservó las tres con mayor impacto compatible."
    : `Solo ${finalists.length} ${finalists.length === 1 ? "promoción pasó" : "promociones pasaron"} las restricciones de margen, inventario y riesgo; no inventé opciones para completar cinco.`;
  return {
    tools,
    constraints: null,
    blocks: [
      text(
        `Consulté demanda prevista, ventas históricas, stock actual y reglas comerciales de ${displayBranchName(store)}. ${selectionText} ` +
          `Su impacto neto esperado es ${mxn(portfolio.net_expected_margin_increment)} (rango de sensibilidad 80 %: ${mxn(ci.low)} a ${mxn(ci.high)}), ` +
          `ya descontando traslapes y canibalización. Resultado: ${top}. Son simulaciones sobre datos de la tienda, no ganancias garantizadas.`,
      ),
      ...selected.map((strategy) => ({ type: "strategy_card" as const, strategy, requires_approval: true })),
      block,
    ],
  };
}

async function replyRestock(storeId: string): Promise<Reply> {
  const tools = [
    tool("get_current_store_context", { store_id: storeId }),
    tool("get_demand_forecast", { store_id: storeId, horizon: 14 }),
  ];
  const block = await restockBlock(storeId);
  if (!block)
    return { tools, constraints: null, blocks: [text("Por ahora no pude armar la lista de reabasto de esta tienda. Revisa el calendario de restock o intenta de nuevo en un momento.")] };
  return {
    tools,
    constraints: null,
    blocks: [
      text(`Estas son las ${block.suggestions.length} sugerencias de reabasto más urgentes de la tienda. Puedes abrir cada una en el calendario para revisar y enviar la orden; nada se envía sin tu confirmación.`),
      block,
    ],
  };
}

function replyInventory(ctx: Ctx, storeId: string): Reply {
  const store = ctx.storeById.get(storeId)!;
  const rows = (ctx.stockByStore.get(storeId) ?? [])
    .filter((row) => row.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity || a.product_id.localeCompare(b.product_id));
  const visible = rows.slice(0, 12);
  const lines = visible.map((row, index) => {
    const product = ctx.productById.get(row.product_id);
    return `${index + 1}) ${product?.product_name ?? row.product_id}: ${n1(row.quantity)} u`;
  });
  return {
    tools: [tool("get_store_inventory_catalog", { store_id: storeId, in_stock_only: true, sort: "quantity_desc", limit: 12 })],
    constraints: null,
    blocks: [
      text(
        `${displayBranchName(store)} tiene ${rows.length} productos con existencia. Estos son los 12 con más unidades disponibles:\n${lines.join("\n")}\n` +
          "Puedes pedirme buscar un producto concreto, una categoría o los artículos con menor existencia.",
      ),
    ],
  };
}

type TrendRank = { product: RawProduct; changePct: number; recentAvg: number; previousAvg: number };

function trendRank(ctx: Ctx, storeId: string, direction: "highest" | "lowest"): TrendRank | null {
  const rows: TrendRank[] = [];
  for (const product of ctx.products) {
    if (!ctx.stockByKey.has(`${storeId}|${product.product_id}`)) continue;
    const series = ctx.sales.series[storeId]?.[product.product_id] ?? [];
    const recent = series.slice(-7);
    const previous = series.slice(-14, -7);
    const recentAvg = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 0;
    const previousAvg = previous.length ? previous.reduce((sum, value) => sum + value, 0) / previous.length : 0;
    // Exclude products without enough activity: otherwise a single unit after a zero week dominates the ranking.
    if (recentAvg + previousAvg < 1) continue;
    const denominator = Math.max(previousAvg, 0.5);
    rows.push({ product, recentAvg, previousAvg, changePct: ((recentAvg - previousAvg) / denominator) * 100 });
  }
  rows.sort((a, b) =>
    direction === "highest"
      ? b.changePct - a.changePct || b.recentAvg - a.recentAvg
      : a.changePct - b.changePct || a.recentAvg - b.recentAvg,
  );
  return rows[0] ?? null;
}

async function replyTrendRanking(ctx: Ctx, storeId: string, direction: "highest" | "lowest"): Promise<Reply> {
  const store = ctx.storeById.get(storeId)!;
  const ranked = trendRank(ctx, storeId, direction);
  if (!ranked) {
    return {
      tools: [tool("rank_product_sales_trends", { store_id: storeId, window_days: 7, direction })],
      constraints: null,
      blocks: [text(`No hay suficiente historial reciente para comparar tendencias en ${displayBranchName(store)}.`)],
    };
  }
  const tendency = await buildTendency(storeId, ranked.product.product_id, 28, 14);
  const label = direction === "highest" ? "el mayor crecimiento" : "la mayor caída";
  const sign = ranked.changePct >= 0 ? "+" : "";
  return {
    tools: [
      tool("rank_product_sales_trends", { store_id: storeId, window_days: 7, direction, min_activity_units_per_day: 1 }),
      tool("get_product_tendency", { store_id: storeId, product_id: ranked.product.product_id, history_days: 28, forecast_days: 14 }),
    ],
    constraints: null,
    blocks: [
      text(
        `${ranked.product.product_name} tiene ${label} en ${displayBranchName(store)}: ${sign}${n1(ranked.changePct)} % ` +
          `al comparar los últimos 7 días (${n1(ranked.recentAvg)} u/día) contra los 7 anteriores (${n1(ranked.previousAvg)} u/día).`,
      ),
      {
        type: "forecast_chart",
        store_id: storeId,
        product_id: ranked.product.product_id,
        history: tendency.history,
        forecast: tendency.forecast,
        ...(tendency.treated ? { treated: tendency.treated } : {}),
      },
    ],
  };
}

async function replyTrend(ctx: Ctx, storeId: string, all: Strategy[], found: Found): Promise<Reply> {
  const store = ctx.storeById.get(storeId)!;
  // Like the backend: without a product in the message, the store's product with the highest expected demand.
  const named = found.products.length > 0;
  const pool = named ? found.products : ctx.products.filter((p) => ctx.stockByKey.has(`${storeId}|${p.product_id}`));
  if (!pool.length)
    return {
      tools: [tool("get_current_store_context", { store_id: storeId })],
      constraints: null,
      blocks: [text(`¿De qué producto quieres ver la tendencia en ${displayBranchName(store)}? Por ejemplo: «${EXAMPLES[0]}».`)],
    };
  // Unnamed: the store's forecast demand, as the backend ranks it; named: the catalog's best seller of the group.
  const demandOf = (x: RawProduct) =>
    named ? x.base_daily_demand : (ctx.stockByKey.get(`${storeId}|${x.product_id}`)?.predicted_daily_demand ?? 0);
  const p = [...pool].sort((a, b) => demandOf(b) - demandOf(a))[0];
  const t = await buildTendency(storeId, p.product_id, 21, 14);
  const promo = liveStrategyFor(all, p.product_id);
  const tools = [
    tool("get_current_store_context", { store_id: storeId }),
    tool("get_product_tendency", { store_id: storeId, product_id: p.product_id, history_days: 21, forecast_days: 14 }),
    tool("get_demand_forecast", { store_id: storeId, product_ids: [p.product_id], horizon: 14 }),
  ];
  if (promo) tools.push(tool("get_product_sell_strategy", { store_id: storeId, product_id: p.product_id }));
  const pick = !named
    ? " (el de mayor demanda de la sucursal)"
    : found.products.length > 1 && found.viaGroup
      ? ` (el de mayor rotación de ${found.label ?? "la categoría"})`
      : "";
  return {
    tools,
    constraints: null,
    blocks: [
      text(`Tendencia de ${p.product_name}${pick} en ${displayBranchName(store)}. ${t.ai_summary ?? ""}`.trim()),
      {
        type: "forecast_chart",
        store_id: storeId,
        product_id: p.product_id,
        history: t.history,
        forecast: t.forecast,
        ...(t.treated ? { treated: t.treated } : {}),
      },
    ],
  };
}

async function replySellStrategy(ctx: Ctx, storeId: string, all: Strategy[], found: Found): Promise<Reply> {
  const p = [...found.products].sort((a, b) => b.base_daily_demand - a.base_daily_demand)[0];
  const promo = p ? liveStrategyFor(all, p.product_id) : undefined;
  const tools = [tool("get_current_store_context", { store_id: storeId })];
  if (!p) return { tools, constraints: null, blocks: [text(`¿Qué producto quieres impulsar? Por ejemplo: «${EXAMPLES[3]}».`)] };
  tools.push(tool("get_product_sell_strategy", { store_id: storeId, product_id: p.product_id }));
  if (!promo)
    return {
      tools,
      constraints: null,
      blocks: [text(`Hoy no hay una estrategia en el plan para ${p.product_name}. Pídeme una con restricciones, por ejemplo: «Aumenta ${p.product_name} el sábado, máximo 10 % de descuento».`)],
    };
  return {
    tools,
    constraints: null,
    blocks: [
      text(`${p.product_name} ya tiene una estrategia en el plan (estado: ${promo.status === "selected" ? "en el plan" : promo.status}). Estos son sus detalles:`),
      { type: "strategy_card", strategy: promo, requires_approval: true },
    ],
  };
}

async function replyStrategy(ctx: Ctx, storeId: string, all: Strategy[], msg: string, found: Found): Promise<Reply> {
  const store = ctx.storeById.get(storeId)!;
  const when = parseWeekday(ctx, msg);
  const cap = parseMaxDiscount(msg);
  const constraints: Constraints = {
    product_ids: found.nameFiltered ? found.products.slice(0, 8).map((p) => p.product_id) : [],
    category_id: found.categoryId,
    weekday: when.weekday,
    max_discount_pct: cap,
  };
  const scope = found.label ?? found.products[0]?.product_name ?? "los productos";
  const tools: ChatTool[] = [
    tool("get_current_store_context", { store_id: storeId }),
    tool("get_demand_forecast", { store_id: storeId, horizon: 14, start_date: when.start }),
    tool("get_historical_insights", { store_id: storeId, scope: found.categoryId ?? found.products[0]?.product_id ?? null, window_days: 30 }),
    tool("get_business_constraints", { store_id: storeId, max_discount_pct: cap, min_margin_pct: 0.15 }),
    tool("simulate_strategy", {
      strategy_type: "contextual_offer", store_id: storeId, category_id: found.categoryId, product_ids: constraints.product_ids,
      start_date: when.start, end_date: when.end, max_discount_pct: cap,
    }),
  ];

  const createdAt = `${ctx.asOf}T12:00:00Z`;
  const row = ctx.calendar.get(when.start);
  const candidates = [...found.products]
    .sort((a, b) => b.base_daily_demand - a.base_daily_demand)
    .slice(0, 10)
    .flatMap((p) => {
      const hot = p.weather_sensitivity === "hot" && (row?.temp_max_c ?? 0) >= 25;
      const cold = p.weather_sensitivity === "cold" && (row?.temp_min_c ?? 99) <= 15;
      const notes = [`pediste impulsar ${scope} ${when.label}`];
      if (row) notes.push(`${row.is_weekend ? "fin de semana" : "día entre semana"}, ${n1(row.temp_max_c)} °C de máxima`);
      const spec: Spec = {
        storeId, type: "contextual_offer", promotedId: p.product_id, anchorId: null, start: when.start, end: when.end,
        drivers: hot || cold ? ["demand", "weather"] : ["demand"], notes, liftBoost: hot || cold ? 1.25 : 1.1,
        minImpact: 1, key: `chat|${p.product_id}|${cap ?? "x"}`, titleHint: when.weekday ? `el ${weekdayEs(when.start)}` : "",
        ...(cap !== null ? { maxDiscountOverride: cap } : {}),
      };
      const ev = evaluateSpec(ctx, spec, createdAt, "draft");
      return ev ? [ev] : [];
    });
  const viable = candidates.filter((c) => c.outcome === "viable").sort((a, b) => b.impact - a.impact);
  const best = viable[0];
  if (!best) {
    const rej = candidates.filter((c) => c.outcome === "rejected").sort((a, b) => b.impact - a.impact)[0];
    const why = rej ? ` Lo más cercano chocó con una restricción: ${rej.strategy.constraints.violations.map((v) => v.message.replace(/\.$/, "")).join("; ")}.` : "";
    return {
      tools, constraints,
      blocks: [text(`No encontré una oferta de ${scope} ${when.label} que cumpla las restricciones de margen, stock y descuento en ${displayBranchName(store)}.${why} Prueba con otro día, otro producto o un tope de descuento mayor.`)],
    };
  }

  const draftId = best.strategy.draft_id;
  const existing = all.find((s) => s.draft_id === draftId);
  const draft: Strategy = existing ?? { ...best.strategy, draft_id: draftId, status: "draft" };
  if (!existing) saveChatDraft(draft);
  tools.push(tool("optimize_portfolio", { store_id: storeId, include_draft: draftId }), tool("create_promotion_draft", { store_id: storeId, draft_id: draftId }));

  const { block } = planSummaryBlock(ctx, all, draft);
  const capTxt = cap !== null ? ` (dentro de tu tope de ${pct0(cap)})` : "";
  const ci = draft.confidence_interval;
  const pName = ctx.productById.get(draft.promoted_product_id)?.product_name ?? draft.promoted_product_id;
  const choice = found.products.length > 1 ? ` De ${scope} elegí ${pName}, la que más margen deja.` : "";
  return {
    tools,
    constraints,
    blocks: [
      text(
        `Preparé un borrador: ${draft.title}.${choice} Descuento propuesto ${pct0(draft.proposed_discount_pct)}${capTxt}; se esperan ${n1(draft.expected_units_increment)} unidades adicionales y ` +
          `${mxn(draft.expected_margin_increment)} de margen incremental (rango 80 %: ${mxn(ci.low)} a ${mxn(ci.high)}). ` +
          (draft.status === "draft"
            ? "Es un borrador: agrégalo al plan para que cuente en el portafolio; la aprobación se hace desde el plan."
            : "Esta estrategia ya está en el plan."),
      ),
      { type: "strategy_card", strategy: draft, requires_approval: true },
      block,
    ],
  };
}

function replyFallback(): Reply {
  return {
    tools: [],
    constraints: null,
    blocks: [
      text(
        "No encontré datos suficientes para responder esa pregunta sin inventar una conclusión. Puedo consultar tendencia, demanda prevista, stock, merma, restock o promociones de la tienda seleccionada. Incluye un producto, un objetivo o una restricción; por ejemplo:\n" +
          EXAMPLES.map((e) => `• ${e}`).join("\n"),
      ),
    ],
  };
}

/* ---------- entry point ---------- */

/** conversation_id → store_id, like the backend's conversation records (a page reload forgets them, as a backend would). */
const conversations = new Map<string, string>();

type AnalysisConversation = { storeId: string | null; productId: string | null };
const analysisConversations = new Map<string, AnalysisConversation>();

type InventoryOutlook = {
  storeId: string;
  product: RawProduct;
  tendency: Awaited<ReturnType<typeof buildTendency>>;
  available: number;
  forecastDemand: number;
  remaining: number;
  stockoutDate: string | null;
  expiryDate: string | null;
  expiryWaste: number;
};

async function inventoryOutlook(ctx: Ctx, storeId: string, product: RawProduct): Promise<InventoryOutlook | null> {
  const stock = ctx.stockByKey.get(`${storeId}|${product.product_id}`);
  if (!stock) return null;
  const tendency = await buildTendency(storeId, product.product_id, 21, 30);
  const horizonEnd = tendency.forecast[tendency.forecast.length - 1]?.date ?? addDays(ctx.asOf, 30);
  const inbound = stock.next_eta && stock.next_eta <= horizonEnd ? stock.on_order_qty : 0;
  const available = stock.quantity + inbound;
  let cumulative = 0;
  let stockoutDate: string | null = null;
  for (const point of tendency.forecast) {
    cumulative += point.p50;
    if (!stockoutDate && cumulative > available) stockoutDate = point.date;
  }
  const forecastDemand = tendency.forecast.reduce((sum, point) => sum + point.p50, 0);
  const expiryDate = stock.earliest_expiry && stock.earliest_expiry <= horizonEnd ? stock.earliest_expiry : null;
  const demandBeforeExpiry = expiryDate
    ? tendency.forecast.filter((point) => point.date <= expiryDate).reduce((sum, point) => sum + point.p50, 0)
    : 0;
  return {
    storeId,
    product,
    tendency,
    available,
    forecastDemand,
    remaining: available - forecastDemand,
    stockoutDate,
    expiryDate,
    expiryWaste: expiryDate ? Math.max(0, stock.quantity - demandBeforeExpiry) : 0,
  };
}

function strongestSignal(a: InventoryOutlook, b: InventoryOutlook): number {
  if (!!a.stockoutDate !== !!b.stockoutDate) return a.stockoutDate ? -1 : 1;
  if (a.stockoutDate && b.stockoutDate && a.stockoutDate !== b.stockoutDate) return a.stockoutDate.localeCompare(b.stockoutDate);
  if ((a.expiryWaste > 0) !== (b.expiryWaste > 0)) return a.expiryWaste > 0 ? -1 : 1;
  if (a.expiryWaste !== b.expiryWaste) return b.expiryWaste - a.expiryWaste;
  return a.remaining - b.remaining;
}

function outlookAnswer(ctx: Ctx, outlook: InventoryOutlook, fromChain: boolean): string {
  const store = ctx.storeById.get(outlook.storeId)!;
  const scope = fromChain
    ? `Analicé las sucursales y fijé ${displayBranchName(store)} porque presenta la señal más relevante para ${outlook.product.product_name}. `
    : `${displayBranchName(store)} · ${outlook.product.product_name}. `;
  const numbers = `Disponibles durante el horizonte: ${n1(outlook.available)} u; demanda central prevista a 30 días: ${n1(outlook.forecastDemand)} u. `;
  let conclusion: string;
  const wasteComesFirst =
    outlook.expiryDate !== null &&
    outlook.expiryWaste > 0 &&
    (outlook.stockoutDate === null || outlook.expiryDate <= outlook.stockoutDate);
  if (wasteComesFirst) {
    const laterStockout = outlook.stockoutDate
      ? ` Después de esa primera caducidad, la demanda también rebasa el inventario alrededor del ${dm(outlook.stockoutDate)}.`
      : "";
    conclusion = `Existe riesgo de merma primero: cerca de ${n1(outlook.expiryWaste)} u podrían seguir en inventario cuando llegue la primera caducidad del ${dm(outlook.expiryDate!)}.${laterStockout}`;
  } else if (outlook.stockoutDate) {
    conclusion = `No hay stock suficiente: con la tendencia P50 se agotaría alrededor del ${dm(outlook.stockoutDate)} y faltarían aproximadamente ${n1(Math.abs(outlook.remaining))} u al cierre del horizonte.`;
  } else {
    conclusion = `Sí hay stock suficiente: después de cubrir la demanda central quedarían aproximadamente ${n1(Math.max(0, outlook.remaining))} u y no aparece riesgo de merma dentro de los próximos 30 días.`;
  }
  return `${scope}${conclusion} ${numbers}${outlook.tendency.ai_summary ?? ""}`.trim();
}

/* ---------- waste risk ---------- */

type WasteRisk = { storeId: string; product: RawProduct; row: StockRow; daysToExpiry: number; units: number; cost: number };

/**
 * Stock that will still be on the shelf when it expires, valued at cost: quantity minus the predicted daily demand until
 * the earliest expiry. It is the engine's baseline-waste rule, so this ranking agrees with the plan's rescue bundles.
 */
function wasteRisks(ctx: Ctx, storeIds: string[], productIds: Set<string> | null): WasteRisk[] {
  const out: WasteRisk[] = [];
  for (const storeId of storeIds) {
    for (const row of ctx.stockByStore.get(storeId) ?? []) {
      if ((productIds && !productIds.has(row.product_id)) || row.quantity <= 0 || !row.earliest_expiry) continue;
      const daysToExpiry = diffDays(ctx.asOf, row.earliest_expiry);
      if (daysToExpiry < 0 || daysToExpiry > waste_horizon_days) continue;
      const units = row.quantity - Math.max(0.1, row.predicted_daily_demand) * daysToExpiry;
      const product = ctx.productById.get(row.product_id);
      const unitCost = ctx.costByProduct.get(row.product_id)?.unit_cost;
      if (units <= 0 || !product || unitCost === undefined) continue;
      out.push({ storeId, product, row, daysToExpiry, units, cost: units * unitCost });
    }
  }
  return out.sort((a, b) => b.cost - a.cost || a.daysToExpiry - b.daysToExpiry || a.storeId.localeCompare(b.storeId));
}

const inDays = (n: number) => (n <= 0 ? "hoy" : n === 1 ? "mañana" : `en ${n} días`);
const periodText = (start: string, end: string) => (start === end ? `El ${dm(start)}` : `Del ${dm(start)} al ${dm(end)}`);

function orderLine(row: StockRow): string {
  if (row.on_order_qty <= 0 || !row.next_eta) return "No tiene pedidos abiertos: no hace falta cancelar nada.";
  return row.earliest_expiry && row.next_eta <= row.earliest_expiry
    ? `Hay un pedido abierto de ${n1(row.on_order_qty)} u que llega el ${dm(row.next_eta)}, antes de la caducidad: revísalo o redúcelo para no sumar inventario que no se va a vender.`
    : `El pedido abierto de ${n1(row.on_order_qty)} u llega el ${dm(row.next_eta)}, después de la caducidad: no necesita cambios.`;
}

/** Why there is no rescue promotion to propose for this stock, in one sentence. */
function noRescueReason(risk: WasteRisk, ev: Evaluated | null, existing: Strategy | undefined): string {
  if (existing) return `La promoción de rescate de este producto ya está ${t("strategyStatus", existing.status).toLowerCase()} en el plan.`;
  if (risk.daysToExpiry < 3) return `Caduca ${inDays(risk.daysToExpiry)}: ya no alcanza el tiempo para una promoción con vigencia.`;
  if (risk.product.shelf_life_days > 60) return "Es un producto de vida útil larga: las promociones de rescate se reservan para perecederos.";
  if (ev?.outcome === "rejected") {
    const why = ev.strategy.constraints.violations.map((v) => v.message.replace(/\.$/, "")).join("; ");
    return `La promoción de rescate chocó con una restricción: ${why}.`;
  }
  return "El motor no encontró una promoción de rescate con impacto suficiente.";
}

/** Nothing will expire unsold (or the named product has no expiry date to worry about). */
function replyNoWasteRisk(ctx: Ctx, requestedStore: string | null, named: RawProduct[]): Reply {
  const store = requestedStore ? ctx.storeById.get(requestedStore) : undefined;
  const tools = [
    tool("get_current_store_context", { store_id: requestedStore, include: ["stock", "inbound_orders"] }),
    tool("get_expiring_inventory", { ...(requestedStore ? { store_id: requestedStore } : {}), horizon_days: waste_horizon_days, rank_by: "projected_waste_cost" }),
  ];
  if (named.length > 0) {
    const names = named.slice(0, 3).map((p) => p.product_name).join(", ");
    return {
      tools,
      constraints: null,
      blocks: [text(`${names} no tiene riesgo de merma en los próximos ${waste_horizon_days} días: según la demanda prevista se vende antes de caducar, o no tiene una caducidad registrada.`)],
    };
  }
  if (!store) {
    return { tools, constraints: null, blocks: [text(`No encontré productos con riesgo de merma en ninguna sucursal en los próximos ${waste_horizon_days} días.`)] };
  }
  const soonest = (ctx.stockByStore.get(store.store_id) ?? [])
    .filter((row) => row.quantity > 0 && row.earliest_expiry && diffDays(ctx.asOf, row.earliest_expiry) >= 0 && diffDays(ctx.asOf, row.earliest_expiry) <= waste_horizon_days)
    .sort((a, b) => a.earliest_expiry!.localeCompare(b.earliest_expiry!))
    .slice(0, 3)
    .map((row) => `${ctx.productById.get(row.product_id)?.product_name ?? row.product_id} (el ${dm(row.earliest_expiry!)}, ${n1(row.quantity)} u)`);
  return {
    tools,
    constraints: null,
    blocks: [
      text(
        `No encontré productos con riesgo de merma en ${displayBranchName(store)} en los próximos ${waste_horizon_days} días: lo que caduca se vende antes de su fecha según la demanda prevista.` +
          (soonest.length ? ` Lo más cercano a caducar: ${soonest.join("; ")}.` : ""),
      ),
    ],
  };
}

type Rescue = { spec: Spec | null; ev: Evaluated | null; existing: Strategy | undefined; strategy: Strategy | null };

const USABLE_STATUSES: readonly Strategy["status"][] = ["draft", "selected", "approved", "scheduled", "active"];

/** The engine's rescue promotion for one at-risk stock, or why there is none. Pure: nothing is saved here. */
function rescueFor(ctx: Ctx, all: Strategy[], risk: WasteRisk): Rescue {
  const spec = rescueSpecFor(ctx, risk.storeId, risk.row, generationOf(risk.storeId));
  const ev = spec ? evaluateSpec(ctx, spec, `${ctx.asOf}T12:00:00Z`, "draft") : null;
  const proposed = ev?.outcome === "viable" ? ev.strategy : null;
  // Same spec and generation as the plan, so an automatic rescue bundle of the plan is found here instead of duplicated.
  const existing = proposed ? all.find((s) => s.draft_id === proposed.draft_id) : undefined;
  const usable = !!proposed && (!existing || USABLE_STATUSES.includes(existing.status));
  return { spec, ev, existing, strategy: usable ? (existing ?? { ...proposed, status: "draft" }) : null };
}

/**
 * "Which product is going to be thrown away, and what do I do about it?" Lists the products that will expire unsold
 * (biggest loss at cost first) and builds the step-by-step plan for the biggest one that can still be rescued with a
 * promotion. That promotion is the engine's own rescue bundle (the plan's, when it already has one), so the figures match
 * the "Plan comercial"; a new one is saved as a chat draft that is only added to the plan and approved from there.
 * What cannot be rescued with a promotion (it expires in less than 3 days) is flagged as urgent instead of hidden.
 */
async function replyWasteRescue(
  ctx: Ctx,
  risks: WasteRisk[],
  fromChain: boolean,
): Promise<{ reply: Reply; storeId: string; productId: string }> {
  const storeId = risks[0].storeId;
  const store = ctx.storeById.get(storeId)!;
  const { all } = await allStrategies(storeId);
  const storeRisks = risks.filter((r) => r.storeId === storeId);
  const rescues = storeRisks.slice(0, 5).map((risk) => ({ risk, ...rescueFor(ctx, all, risk) }));
  const focus = rescues.find((r) => r.strategy) ?? rescues[0];
  const { risk: top, spec, ev, existing, strategy } = focus;
  const { product, row } = top;
  const expiry = row.earliest_expiry!;
  const isNewDraft = !!strategy && !existing;
  if (strategy && isNewDraft) saveChatDraft(strategy);

  const lead = fromChain
    ? `Analicé las sucursales y fijé ${displayBranchName(store)} porque ahí está el mayor riesgo de merma. Estos productos pueden terminar en merma (de mayor a menor pérdida a costo):`
    : `${displayBranchName(store)}: estos productos pueden terminar en merma (de mayor a menor pérdida a costo):`;
  const bullets = rescues.slice(0, 3).map(({ risk, strategy: s }) => {
    const tail = s ? " Se puede rescatar con una promoción." : risk.daysToExpiry < 3 ? " Ya no alcanza el tiempo para una promoción." : "";
    const sold = risk.row.quantity - risk.units;
    const soldText = sold < 0.5 ? "no da tiempo de venderlas" : `se venderían unas ${n1(sold)}`;
    return (
      `• ${risk.product.product_name}: caduca el ${dm(risk.row.earliest_expiry!)} (${inDays(risk.daysToExpiry)}); hay ${n1(risk.row.quantity)} u y ${soldText}: ` +
      `sobrarían unas ${n1(risk.units)} u (${mxn(risk.cost)} a costo).${tail}`
    );
  });
  const planTitle =
    top === rescues[0].risk
      ? `Plan para no desperdiciar ${product.product_name}:`
      : `Plan para no desperdiciar ${product.product_name}, el de mayor merma que todavía se puede rescatar con una promoción:`;

  const steps: string[] = [];
  if (strategy) {
    const anchor = strategy.anchor_product_id ? ctx.productById.get(strategy.anchor_product_id)?.product_name : undefined;
    const ci = strategy.confidence_interval;
    steps.push(
      `${periodText(strategy.period.start_date, strategy.period.end_date)}: ${strategy.title}, con ${pct0(strategy.proposed_discount_pct)} de descuento. ` +
        `Se esperan ${n1(strategy.expected_units_increment)} u adicionales y se evitan ${mxn(strategy.expected_waste_reduction)} de merma (margen incremental ${mxn(strategy.expected_margin_increment)}, rango 80 %: ${mxn(ci.low)} a ${mxn(ci.high)}).`,
      `En tienda: colócalo a la vista y pide a caja que lo ofrezca${anchor ? ` junto con ${anchor}` : ""} en cada ticket durante esos días.`,
      orderLine(row),
      `Seguimiento: el ${dm(addDays(strategy.period.end_date, 1))} revisa cuántas piezas quedan; si sobran, retíralas al caducar (${dm(expiry)}) y regístralas como merma.`,
    );
  } else {
    steps.push(
      noRescueReason(top, ev, existing),
      "En tienda: colócalo a la vista y ofrécelo en caja desde hoy; si tu política lo permite, aplica un descuento de liquidación.",
      orderLine(row),
      `Seguimiento: al llegar la caducidad (${dm(expiry)}) retira lo que quede, regístralo como merma y revisa el máximo de este producto para el siguiente pedido.`,
    );
  }
  const closing = !strategy
    ? "Son estimaciones con los datos de la tienda."
    : existing
      ? `Esta promoción ya está en el plan${existing.status === "selected" ? "" : ` (${t("strategyStatus", existing.status).toLowerCase()})`}: ábrela para revisarla. Son simulaciones, no ganancias garantizadas.`
      : "Es un borrador: agrégalo al plan para que cuente en el portafolio; la aprobación se hace desde el plan, con confirmación. Son simulaciones, no ganancias garantizadas.";

  const tools: ChatTool[] = [
    tool("get_current_store_context", { store_id: storeId, include: ["stock", "inbound_orders", "active_promotions"] }),
    tool("get_expiring_inventory", { ...(fromChain ? {} : { store_id: storeId }), horizon_days: waste_horizon_days, rank_by: "projected_waste_cost" }),
    tool("get_product_tendency", { store_id: storeId, product_id: product.product_id, history_days: 21, forecast_days: 14 }),
  ];
  if (spec) {
    tools.push(
      tool("simulate_strategy", {
        strategy_type: "rescue_bundle", store_id: storeId, product_id: product.product_id, anchor_product_id: spec.anchorId,
        start_date: spec.start, end_date: spec.end,
      }),
    );
  }
  if (strategy && isNewDraft) {
    tools.push(tool("optimize_portfolio", { store_id: storeId, include_draft: strategy.draft_id }), tool("create_promotion_draft", { store_id: storeId, draft_id: strategy.draft_id }));
  }

  const blocks: unknown[] = [
    text(
      [
        lead,
        ...bullets,
        planTitle,
        ...steps.map((step, i) => `${i + 1}) ${step}`),
        closing,
      ].join("\n"),
    ),
  ];
  if (strategy) {
    blocks.push({ type: "strategy_card", strategy, requires_approval: true });
    if (isNewDraft) blocks.push(planSummaryBlock(ctx, all, strategy).block);
  }
  const tendency = await buildTendency(storeId, product.product_id, 21, 14);
  blocks.push({
    type: "forecast_chart",
    store_id: storeId,
    product_id: product.product_id,
    history: tendency.history,
    forecast: tendency.forecast,
    ...(tendency.treated ? { treated: tendency.treated } : {}),
  });
  return { reply: { tools, constraints: null, blocks }, storeId, productId: product.product_id };
}

/**
 * Waste-risk questions. Null when the message names a product and only asks about it: that keeps the per-product
 * outlook (stock vs. demand, first expiry) below. Without a product it ranks the store (or the chain) and answers with a plan.
 */
async function replyWaste(
  ctx: Ctx,
  requestedStore: string | null,
  message: string,
  wantsPlan: boolean,
): Promise<{ reply: Reply; storeId: string | null; productId: string | null } | null> {
  const named = findProducts(ctx, requestedStore, message).products;
  if (named.length > 0 && !wantsPlan) return null;
  const storeIds = requestedStore ? [requestedStore] : ctx.stores.map((s) => s.store_id);
  const risks = wasteRisks(ctx, storeIds, named.length > 0 ? new Set(named.map((p) => p.product_id)) : null);
  if (risks.length === 0) {
    return { reply: replyNoWasteRisk(ctx, requestedStore, named), storeId: requestedStore, productId: named.length === 1 ? named[0].product_id : null };
  }
  return replyWasteRescue(ctx, risks, requestedStore === null);
}

/* ---------- analysis entry point ---------- */

function chartProductIdOf(reply: Reply): string | null {
  const chart = reply.blocks.find((block) => typeof block === "object" && block !== null && "type" in block && block.type === "forecast_chart");
  return chart && typeof chart === "object" && "product_id" in chart && typeof chart.product_id === "string" ? chart.product_id : null;
}

/** Wraps an analysis reply in the response and remembers the conversation's store and product for the follow-ups. */
function analysisResponse(
  requestedConversation: string | null,
  scopeStore: string | null,
  message: string,
  reply: Reply,
  focusStoreId: string | null,
  focusProductId: string | null,
): ChatResponse {
  counter++;
  const conversationId = requestedConversation ?? `conv_analysis_${hashId(`${scopeStore ?? "all"}|${counter}|${message}`)}`;
  const messageId = `msg_${hashId(`${conversationId}|${counter}|${message}`)}`;
  analysisConversations.set(conversationId, { storeId: focusStoreId, productId: focusProductId });
  return {
    conversation_id: conversationId,
    message_id: messageId,
    focus_store_id: focusStoreId,
    focus_product_id: focusProductId,
    tools: reply.tools,
    interpreted_constraints: reply.constraints,
    blocks: reply.blocks,
  };
}

/**
 * Chain/store analysis used while Lambda still requires store_id and has no stock-vs-demand answer.
 * It returns the same closed GenUI block union, so components do not know whether the answer came from this
 * compatibility endpoint or POST /chat. Which question is being asked comes from lib/chatIntent.ts, the same
 * detector that routes the message here.
 */
export async function handleAnalysis(body: unknown): Promise<ChatResponse> {
  const b = (body && typeof body === "object" ? body : {}) as {
    store_id?: unknown;
    conversation_id?: unknown;
    context_product_id?: unknown;
    message?: unknown;
  };
  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (!message || new TextEncoder().encode(message).length > 2000)
    throw new MockHttpError(400, "invalid_request", "message es obligatorio (máximo 2000 caracteres).");

  const ctx = await loadCtx();
  const requestedStore = typeof b.store_id === "string" && b.store_id ? b.store_id : null;
  if (requestedStore && !ctx.storeById.has(requestedStore))
    throw new MockHttpError(404, "store_not_found", `Tienda desconocida: ${requestedStore}`);
  const requestedConversation = typeof b.conversation_id === "string" && b.conversation_id ? b.conversation_id : null;
  const previous = requestedConversation ? analysisConversations.get(requestedConversation) : undefined;
  if (requestedConversation && !previous)
    throw new MockHttpError(404, "conversation_not_found", "La conversación de análisis ya no está disponible.");

  const respond = (reply: Reply, focusStoreId: string | null, focusProductId: string | null) =>
    analysisResponse(requestedConversation, requestedStore, message, reply, focusStoreId, focusProductId);
  const intent = detectAnalysisIntent(message);

  // General commercial-decision questions use the deterministic plan engine. They never go to the LLM-only path,
  // which may describe a plausible promotion without actually comparing forecast, history, stock and constraints.
  if (requestedStore && intent?.kind === "promotion_plan") {
    const { all } = await allStrategies(requestedStore);
    return respond(await replyPlan(ctx, requestedStore, all), requestedStore, null);
  }

  if (requestedStore && intent?.kind === "inventory_catalog") return respond(replyInventory(ctx, requestedStore), requestedStore, null);

  if (requestedStore && intent?.kind === "trend_ranking") {
    const reply = await replyTrendRanking(ctx, requestedStore, intent.direction);
    return respond(reply, requestedStore, chartProductIdOf(reply));
  }

  if (intent?.kind === "waste_risk") {
    const waste = await replyWaste(ctx, requestedStore, message, intent.wantsPlan);
    if (waste) return respond(waste.reply, waste.storeId, waste.productId);
  }

  const contextProductId =
    typeof b.context_product_id === "string" && ctx.productById.has(b.context_product_id)
      ? b.context_product_id
      : previous?.productId ?? null;
  const found = findProducts(ctx, requestedStore, message);
  const product =
    [...found.products].sort((a, b) => b.base_daily_demand - a.base_daily_demand)[0] ??
    (contextProductId ? ctx.productById.get(contextProductId) : undefined) ??
    (/tendencia|pronostico|pronóstico|demanda|ventas/i.test(message)
      ? [...ctx.products].sort((a, b) => b.base_daily_demand - a.base_daily_demand)[0]
      : undefined);

  if (!product) {
    return respond(
      {
        tools: [tool("search_products", { query: message })],
        constraints: null,
        blocks: [
          text("Dime qué producto quieres analizar. Por ejemplo: «¿Tengo stock suficiente de Coca-Cola 600 ml?» o «¿Se agotará Tecate Light al final del mes?»."),
        ],
      },
      requestedStore,
      null,
    );
  }

  const storeIds = requestedStore
    ? [requestedStore]
    : ctx.stores.filter((store) => ctx.stockByKey.has(`${store.store_id}|${product.product_id}`)).map((store) => store.store_id);
  const candidates = (
    await Promise.all(storeIds.map((storeId) => inventoryOutlook(ctx, storeId, product)))
  ).filter((item): item is InventoryOutlook => item !== null);
  const outlook = candidates.sort(strongestSignal)[0];
  if (!outlook) {
    return respond(
      {
        tools: [tool("get_chain_inventory_outlook", { product_id: product.product_id })],
        constraints: null,
        blocks: [text(`No encontré inventario disponible de ${product.product_name} para construir el análisis.`)],
      },
      requestedStore,
      product.product_id,
    );
  }

  return respond(
    {
      tools: [
        tool(requestedStore ? "get_store_inventory_outlook" : "get_chain_inventory_outlook", {
          ...(requestedStore ? { store_id: requestedStore } : {}),
          product_id: product.product_id,
          horizon_days: 30,
        }),
        tool("get_product_tendency", {
          store_id: outlook.storeId,
          product_id: product.product_id,
          history_days: 21,
          forecast_days: 30,
        }),
      ],
      constraints: null,
      blocks: [
        text(outlookAnswer(ctx, outlook, requestedStore === null)),
        {
          type: "forecast_chart",
          store_id: outlook.storeId,
          product_id: product.product_id,
          history: outlook.tendency.history,
          forecast: outlook.tendency.forecast,
          ...(outlook.tendency.treated ? { treated: outlook.tendency.treated } : {}),
        },
      ],
    },
    outlook.storeId,
    product.product_id,
  );
}

// Same validations and error codes as the backend's POST /chat (api/functions/chat/main.go).
export async function handleChat(body: unknown): Promise<ChatResponse> {
  const b = (body && typeof body === "object" ? body : {}) as { store_id?: unknown; conversation_id?: unknown; message?: unknown };
  const storeId = typeof b.store_id === "string" ? b.store_id.trim() : "";
  if (!storeId) throw new MockHttpError(422, "store_required", "Selecciona una tienda para usar el asistente.");
  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (!message || new TextEncoder().encode(message).length > 2000)
    throw new MockHttpError(400, "invalid_request", "message es obligatorio (máximo 2000 caracteres).");
  const requested = typeof b.conversation_id === "string" && b.conversation_id ? b.conversation_id : null;
  if (requested && conversations.get(requested) !== storeId)
    throw new MockHttpError(404, "conversation_not_found", "La conversación no existe para esta tienda.");
  const ctx = await loadCtx();
  if (!ctx.storeById.has(storeId)) throw new MockHttpError(404, "store_not_found", `Tienda desconocida: ${storeId}`);
  const { all } = await allStrategies(storeId);

  counter++;
  const conversationId = requested ?? `conv_${hashId(`${storeId}|${counter}|${message}`)}`;
  conversations.set(conversationId, storeId);
  const messageId = `msg_${hashId(`${conversationId}|${counter}|${message}`)}`;

  const msg = norm(message);
  const found = findProducts(ctx, storeId, message);
  const hasTarget = found.products.length > 0;
  let reply: Reply;
  if (/\b(activ(a|ala|alo|ar|e)|aprueb(a|ala|alo)|aprobar|aprobala|lanz(a|ala)|publica(la)?)\b/.test(msg) && !/propon|crea|genera|prepara|arma/.test(msg)) reply = await replyApprove(storeId);
  else if (/bloque desconocido/.test(msg)) reply = { ...replyFallback(), blocks: [...replyFallback().blocks, { type: "experimental_widget", payload: { note: "bloque de ejemplo no soportado" } }] };
  else if (/(mejor(es)?\s+(promocion|promociones|estrategia|estrategias|plan)|\bplan\b|portafolio|resumen del plan|que promociones|promociones sugeridas|estrategias del plan|que recomiendas|que conviene|oportunidades? (comerciales?|de venta)|como (mejorar|subir|incrementar) (las )?ventas|analiza (la )?tienda)/.test(msg) && !/aumenta|sube|impulsa|propon|crea\b/.test(msg))
    reply = await replyPlan(ctx, storeId, all);
  else if (/(aumenta|sube|impulsa|incrementa|propon|crea|genera|prepara|arma|disena|quiero (una )?(promocion|oferta|descuento)|descuento|oferta de)/.test(msg) && (hasTarget || /\d\s*%/.test(msg)))
    reply = hasTarget ? await replyStrategy(ctx, storeId, all, msg, found) : replyFallback();
  else if (/(que (debo )?(pedir|pido|ordeno|compro|reponer|surtir)|restock|reabast|resurt|pedido|faltante|por pedir)/.test(msg)) reply = await replyRestock(storeId);
  else if (/(como (vendo|vender|impulso)|estrategia para|como mover)/.test(msg)) reply = await replySellStrategy(ctx, storeId, all, found);
  else if (/(tendencia|pronostico|forecast|proyeccion|demanda|ventas|vendera|como va|como vamos)/.test(msg)) reply = await replyTrend(ctx, storeId, all, found);
  else if (/(promocion|oferta|descuento)/.test(msg) && hasTarget) reply = await replyStrategy(ctx, storeId, all, msg, found);
  else reply = replyFallback();

  return {
    conversation_id: conversationId,
    message_id: messageId,
    tools: reply.tools,
    interpreted_constraints: reply.constraints,
    blocks: reply.blocks,
  };
}

