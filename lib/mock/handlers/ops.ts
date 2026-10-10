import type { PolicySuggestion, RestockOrder } from "@/types";
import { hash01 } from "../db";
import { MockHttpError, type MockRoute } from "../router";
import { getState, mutate } from "../store";
import { buildCalendar } from "../ops/calendar";
import { addDays, loadOps, nowIso, paginate, round2, rowsOf, sentOrdersByKey, type OpsData } from "../ops/common";
import { parseSuggestionId, suggestionsFor } from "../ops/restock";
import { filterRows, policyPage, stockPage, summarize, suggestPolicy, toPolicyItem, validatePolicy } from "../ops/stock";

// Mock "backend" for stock, restock, calendar and orders (docs/backend-contract.md §3.7-3.13, 3.15).
// Rules are invented but deterministic and derived from lib/mock/data; the frontend never computes any of this.

async function storeRows(storeId: string, d: OpsData) {
  const rows = rowsOf(d, storeId);
  if (!rows) throw new MockHttpError(404, "store_not_found", `Tienda desconocida: ${storeId}`);
  return rows;
}

const isTrue = (v: string | undefined) => v === "true" || v === "1";

/** Stable, realistic purchase-order number for a suggestion (PO-<year>-<6 digits>). */
function orderNumber(asOf: string, suggestionId: string): string {
  const n = Math.floor(hash01(`po|a|${suggestionId}`) * 1000) * 1000 + Math.floor(hash01(`po|b|${suggestionId}`) * 1000);
  return `PO-${asOf.slice(0, 4)}-${String(n).padStart(6, "0")}`;
}

export const routes: MockRoute[] = [
  {
    method: "GET",
    path: "/stores/:storeId/stock",
    handler: async ({ params, query, empty }) => {
      const d = await loadOps();
      const rows = await storeRows(params.storeId, d);
      if (empty) return paginate([], query);
      return stockPage(d, rows, query, sentOrdersByKey());
    },
  },
  {
    method: "GET",
    path: "/stock/summary",
    handler: async ({ query, empty }) => {
      const d = await loadOps();
      if (empty) return { total: 0, out: 0, low: 0, ok: 0, over: 0 };
      const rows = await storeRows(query.store_id || "all", d);
      return summarize(filterRows(d, rows, { categoryId: query.category_id, q: query.q }));
    },
  },
  {
    method: "GET",
    path: "/stores/:storeId/stock-policy",
    handler: async ({ params, query, empty }) => {
      const d = await loadOps();
      const rows = await storeRows(params.storeId, d);
      if (params.storeId === "all") throw new MockHttpError(400, "store_required", "Elige una sucursal");
      if (empty) return { store_id: params.storeId, ...paginate([], query) };
      return policyPage(d, params.storeId, rows, query);
    },
  },
  {
    method: "PUT",
    path: "/stores/:storeId/stock-policy",
    handler: async ({ params, body }) => {
      const d = await loadOps();
      await storeRows(params.storeId, d);
      if (params.storeId === "all") throw new MockHttpError(400, "store_required", "Elige una sucursal");
      const { items, errors } = validatePolicy(d, params.storeId, body);
      if (errors.length > 0) throw new MockHttpError(422, "invalid_policy", errors.join("; "));
      const updatedAt = nowIso(d.asOf);
      mutate((s) => {
        for (const it of items) {
          s.policies[`${params.storeId}|${it.product_id}`] = { reorder_point: it.reorder_point, max_stock: it.max_stock, updated_at: updatedAt };
        }
      });
      return { items: items.map((it) => toPolicyItem(d, d.rowByKey.get(`${params.storeId}|${it.product_id}`)!)) };
    },
  },
  {
    method: "POST",
    path: "/stores/:storeId/stock-policy:suggest",
    handler: async ({ params, body, empty }) => {
      const d = await loadOps();
      const rows = await storeRows(params.storeId, d);
      if (params.storeId === "all") throw new MockHttpError(400, "store_required", "Elige una sucursal");
      const ids = (body as { product_ids?: unknown } | null)?.product_ids;
      const wanted = Array.isArray(ids) && ids.length > 0 ? new Set(ids.map(String)) : null;
      const picked = empty ? [] : rows.filter((r) => !wanted || wanted.has(r.product_id));
      const result: PolicySuggestion = { store_id: params.storeId, items: picked.map((r) => suggestPolicy(d, r)) };
      return result;
    },
  },
  {
    method: "GET",
    path: "/stores/:storeId/restock-suggestions",
    handler: async ({ params, query, empty }) => {
      const d = await loadOps();
      const rows = await storeRows(params.storeId, d);
      if (empty) return paginate([], query);
      const from = query.from || d.asOf;
      const to = query.to || addDays(from, 14);
      let list = suggestionsFor(d, rows, sentOrdersByKey()).filter((s) => s.expected_delivery_date >= from && s.order_date <= to);
      if (isTrue(query.urgent_only)) list = list.filter((s) => s.is_urgent);
      if (query.product_id) list = list.filter((s) => s.product_id === query.product_id);
      return paginate(list, query);
    },
  },
  {
    method: "POST",
    path: "/restock-orders",
    handler: async ({ body }) => {
      const d = await loadOps();
      const req = (body ?? {}) as { suggestion_id?: unknown; supplier_id?: unknown; qty?: unknown };
      const id = typeof req.suggestion_id === "string" ? req.suggestion_id : "";
      const parsed = parseSuggestionId(id);
      const row = parsed ? d.rowByKey.get(`${parsed.storeId}|${parsed.productId}`) : undefined;
      if (!parsed || !row) throw new MockHttpError(404, "suggestion_not_found", "La sugerencia no existe");

      // Idempotent by suggestion_id: a retry returns the order already sent.
      const existing = getState().sentOrders[id] as RestockOrder | undefined;
      if (existing) return existing;

      const offer = d.offers.get(parsed.productId)?.find((o) => o.supplier_id === req.supplier_id);
      if (!offer) throw new MockHttpError(422, "invalid_supplier", "El proveedor no ofrece este producto");
      const qty = Number(req.qty);
      if (!Number.isInteger(qty) || qty < offer.min_order_qty) {
        throw new MockHttpError(422, "below_min_order_qty", `Cantidad mínima: ${offer.min_order_qty}`);
      }
      const supplier = d.suppliers.get(offer.supplier_id);
      const store = d.stores.get(parsed.storeId);
      const orderId = orderNumber(d.asOf, id);
      const order: RestockOrder = {
        order_id: orderId,
        suggestion_id: id,
        store_id: parsed.storeId,
        product_id: parsed.productId,
        supplier_id: offer.supplier_id,
        qty,
        unit_cost: offer.unit_cost,
        estimated_cost: round2(qty * offer.unit_cost),
        order_date: parsed.date,
        expected_delivery_date: addDays(parsed.date, offer.lead_time_days),
        status: "sent",
        sent_at: nowIso(d.asOf),
        email: {
          to: supplier?.email ?? "",
          subject: `Orden de compra ${orderId} — Retail ${store?.colonia ?? parsed.storeId}`,
          provider_message_id: `re_${Math.floor(hash01(`msg|a|${id}`) * 1e4)}${Math.floor(hash01(`msg|b|${id}`) * 1e4)}`,
        },
        demo_redirect: true,
      };
      mutate((s) => {
        s.sentOrders[id] = order;
      });
      return order;
    },
  },
  // Free-form e-mail to the address in the body (nothing is really sent in mock mode).
  {
    method: "POST",
    path: "/emails",
    handler: async ({ body }) => {
      const d = await loadOps();
      const m = (body ?? {}) as { to?: unknown; subject?: unknown };
      if (typeof m.to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.to)) throw new MockHttpError(400, "invalid_request", "to debe ser un correo válido.");
      if (typeof m.subject !== "string" || !m.subject.trim()) throw new MockHttpError(400, "invalid_request", "subject es obligatorio.");
      return {
        status: "sent" as const,
        sent_at: nowIso(d.asOf),
        email: { to: m.to, subject: m.subject, provider_message_id: `re_mock_${Math.floor(hash01(`mail|${m.to}|${m.subject}`) * 1e8)}` },
      };
    },
  },
  {
    method: "POST",
    path: "/suppliers/:supplierId/test-email",
    handler: async ({ params }) => {
      const d = await loadOps();
      const supplier = d.suppliers.get(params.supplierId);
      if (!supplier) throw new MockHttpError(404, "supplier_not_found", "El proveedor no existe");
      return { supplier_id: supplier.supplier_id, status: "sent" as const, sent_at: nowIso(d.asOf), email: { to: supplier.email }, demo_redirect: true };
    },
  },
  {
    method: "GET",
    path: "/stores/:storeId/calendar",
    handler: async ({ params, query, empty }) => {
      const d = await loadOps();
      if (params.storeId === "all") throw new MockHttpError(400, "store_required", "Elige una sucursal");
      const rows = await storeRows(params.storeId, d);
      return buildCalendar(d, params.storeId, rows, sentOrdersByKey(), query, empty);
    },
  },
];
