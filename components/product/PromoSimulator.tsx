"use client";

import type { ReactNode } from "react";
import { simulateForPromo } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney, formatNumber, formatSignedMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Product, PromoSuggestion } from "@/types";

const P = copy.product;

export function PromoSimulator({
  product,
  promo,
  discount,
  onDiscount,
  chart,
}: {
  product: Product;
  promo: PromoSuggestion | null;
  discount: number;
  onDiscount: (d: number) => void;
  chart: ReactNode;
}) {
  const sim = promo ? simulateForPromo(promo.id, discount) : null;
  const stock = sim?.input.stock ?? 0;

  const tiles = [
    { label: P.metrics.demand14, value: sim ? `${formatNumber(sim.with.unitsSold)} ${copy.common.units}` : "—", tone: "text-foreground" },
    { label: P.metrics.stock, value: sim ? `${formatNumber(stock)} ${copy.common.units}` : "—", tone: "text-foreground" },
    { label: P.metrics.daysToExpiry, value: `${Math.round(product.shelfLifeDays * 0.6)}`, tone: "text-info" },
    { label: P.metrics.wasteExpected, value: sim ? `${formatNumber(sim.with.wasteUnits)} ${copy.common.units}` : "—", tone: "text-alert" },
  ];

  const rows: { label: string; key: keyof NonNullable<typeof sim>["with"]; money: boolean; invert?: boolean }[] = [
    { label: P.rows.unitsSold, key: "unitsSold", money: false },
    { label: P.rows.revenue, key: "revenue", money: true },
    { label: P.rows.margin, key: "margin", money: true },
    { label: P.rows.wasteCost, key: "wasteCost", money: true, invert: true },
    { label: P.rows.crossSell, key: "crossSellRevenue", money: true },
    { label: P.rows.net, key: "netProfit", money: true },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <p className="text-sm font-semibold text-muted">{t.label}</p>
            <p className={`mt-2 text-2xl font-extrabold ${t.tone}`}>{t.value}</p>
          </Card>
        ))}
      </div>

      {chart}

      {promo && sim && (
        <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <Card className="flex flex-col gap-5 border-accent/30 bg-accent-tint/30">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-accent-dark">{P.promoTitle}</h2>
              <Badge tone="orange">IA</Badge>
            </div>
            <p className="text-sm font-semibold leading-snug">{promo.title}</p>

            <div>
              <div className="flex items-end justify-between">
                <label htmlFor="discount" className="text-sm font-semibold text-muted">{P.discount}</label>
                <span className="text-3xl font-extrabold text-accent">{discount}%</span>
              </div>
              <input
                id="discount"
                type="range"
                min={0}
                max={40}
                step={1}
                value={discount}
                onChange={(e) => onDiscount(Number(e.target.value))}
                aria-valuetext={`${discount}%`}
                className="mt-2 h-11 w-full cursor-pointer accent-[#E8590C]"
                disabled={promo.status !== "pending"}
              />
              <div className="flex justify-between text-xs text-muted"><span>0%</span><span>40%</span></div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  {P.optimal}: <strong className="text-primary">{promo.optimalDiscountPct}%</strong>
                </p>
                {discount !== promo.optimalDiscountPct && promo.status === "pending" && (
                  <button type="button" onClick={() => onDiscount(promo.optimalDiscountPct)} className="min-h-10 rounded-[10px] bg-white px-3 text-sm font-semibold text-primary underline">
                    {P.useOptimal}
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-extrabold">{P.reasonsTitle}</h3>
              <ul className="flex flex-col gap-2 text-sm leading-snug text-muted">
                {promo.drivers.map((d) => (
                  <li key={d} className="flex gap-2"><span aria-hidden className="text-accent">●</span>{P.reasons[d]}</li>
                ))}
                <li className="flex gap-2"><span aria-hidden className="text-accent">●</span>{P.reasons.diminishing}</li>
              </ul>
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-extrabold">{P.compareTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-background p-4">
                <p className="text-sm font-bold text-muted">{P.decline}</p>
                <p className="mt-2 text-2xl font-extrabold">{formatMoney(sim.without.netProfit)}</p>
                <p className="text-xs text-muted">{P.rows.net}</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary-tint p-4">
                <p className="text-sm font-bold text-primary">{P.accept}</p>
                <p className="mt-2 text-2xl font-extrabold text-primary">{formatMoney(sim.with.netProfit)}</p>
                <p className="text-xs font-bold text-primary">{formatSignedMoney(sim.with.netProfit - sim.without.netProfit)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-muted">
                    <th className="py-2 pr-3"><span className="sr-only">Concepto</span></th>
                    <th className="py-2 pr-3 text-right">{P.decline}</th>
                    <th className="py-2 pr-3 text-right">{P.accept}</th>
                    <th className="py-2 text-right">{P.difference}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const a = sim.without[r.key];
                    const b = sim.with[r.key];
                    const diff = b - a;
                    const good = r.invert ? diff <= 0 : diff >= 0;
                    const fmt = (v: number) => (r.money ? formatMoney(v) : formatNumber(v));
                    return (
                      <tr key={r.key} className={`border-t border-line ${r.key === "netProfit" ? "font-extrabold" : ""}`}>
                        <td className="py-2 pr-3">{r.label}</td>
                        <td className="py-2 pr-3 text-right">{fmt(a)}</td>
                        <td className="py-2 pr-3 text-right">{fmt(b)}</td>
                        <td className={`py-2 text-right font-bold ${diff === 0 ? "text-muted" : good ? "text-primary" : "text-alert"}`}>
                          {diff > 0 ? "+" : diff < 0 ? "−" : ""}{fmt(Math.abs(diff))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
