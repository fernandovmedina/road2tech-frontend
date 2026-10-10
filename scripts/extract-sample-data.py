#!/usr/bin/env python3
"""Extract a compact JSON sample set from the backend's generated v2 CSVs.

Usage:
    python scripts/extract-sample-data.py <v2_csv_dir> [out_dir]

out_dir defaults to lib/mock/data/ (relative to the repo root). CSVs are never copied
into this repo. Deterministic: same input -> same output.

Full mode needs the files produced by `scripts/dataset/run_all.py` in the backend.
If sales.csv/inventory_daily.csv/ticket_lines.csv/... are missing (old v2 folder), the
script falls back to a deterministic "seed" mode derived from catalogs and old tables
and flags it in meta.json (`source`). See lib/mock/data/README.md.
"""
from __future__ import annotations

import itertools
import json
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[1]
SALES_DAYS = 44          # 30 history + margin for ranges (+14 forecast is ML, not data)
CALENDAR_PAST_DAYS = 60
FORECAST_DAYS = 14
SAFETY_PERISHABLE, SAFETY_STABLE, PERISHABLE_MAX_SHELF = 1, 3, 30
KEY_PRODUCTS = 12


def has(src: Path, name: str) -> bool:
    return (src / f"{name}.csv").exists()


def rd(src: Path, name: str, **kw) -> pd.DataFrame:
    return pd.read_csv(src / f"{name}.csv", **kw)


def nn(v):
    """NaN/NA -> None, numpy scalars -> python."""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return None if math.isnan(v) else float(v)
    if v is pd.NA or v is pd.NaT:
        return None
    return v


def records(df: pd.DataFrame) -> list[dict]:
    return [{k: nn(v) for k, v in r.items()} for r in df.to_dict("records")]


def table(df: pd.DataFrame) -> dict:
    """Columnar-row format: {columns, rows} (smaller than list of objects)."""
    return {"columns": list(df.columns), "rows": [[nn(v) for v in r] for r in df.itertuples(index=False, name=None)]}


def dump(out: Path, name: str, obj) -> None:
    path = out / f"{name}.json"
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    src = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else REPO / "lib" / "mock" / "data"
    out.mkdir(parents=True, exist_ok=True)
    full = all(has(src, n) for n in ("sales", "inventory_daily", "ticket_lines", "forecast_context"))
    print(f"source={src}  mode={'generator (full)' if full else 'SEED (partial csv set)'}")

    stores = rd(src, "stores")
    zones = rd(src, "zones")
    categories = rd(src, "categories")
    products = rd(src, "products")
    suppliers = rd(src, "suppliers")
    offers = rd(src, "supplier_products")
    calendar = rd(src, "calendar")
    weather = rd(src, "weather")
    po = rd(src, "purchase_orders")
    lots = rd(src, "inventory_lots")

    calendar["date"] = pd.to_datetime(calendar["date"])
    asof = calendar["date"].max()
    print(f"data_as_of={asof.date()}")
    first_day = asof - pd.Timedelta(days=SALES_DAYS - 1)
    dates44 = pd.date_range(first_day, asof, freq="D")

    # ---- sales (last 44 days) ------------------------------------------------
    sales_cols = ["date", "store_id", "product_id", "units_sold", "net_revenue", "campaign_units"]
    chunks = []
    sales_path = src / "sales.csv"
    for ch in pd.read_csv(sales_path, usecols=lambda c: c in sales_cols, chunksize=500_000):
        ch["date"] = pd.to_datetime(ch["date"])
        ch = ch[ch["date"] >= first_day - pd.Timedelta(days=0)]
        if len(ch):
            chunks.append(ch)
    sales = pd.concat(chunks, ignore_index=True)
    store_ids = list(stores["store_id"])
    product_ids = list(products["product_id"])
    piv = (sales.pivot_table(index=["store_id", "product_id"], columns="date", values="units_sold", aggfunc="sum", fill_value=0)
           .reindex(columns=dates44, fill_value=0))
    sales_series: dict[str, dict[str, list[int]]] = {s: {} for s in store_ids}
    for (s, p), row in zip(piv.index, piv.to_numpy()):
        sales_series[s][p] = [int(x) for x in row]
    # 14d mean per store x product (fallback demand)
    mean14 = {(s, p): float(np.mean(v[-14:])) for s, d in sales_series.items() for p, v in d.items()}
    dump(out, "sales_daily", {"start": str(dates44[0].date()), "end": str(asof.date()), "days": len(dates44),
                              "storeIds": store_ids, "productIds": product_ids,
                              "note": "series[store_id][product_id] = units_sold per day, oldest first",
                              "series": sales_series})

    # ---- stock (current) -----------------------------------------------------
    inv_last = None
    if has(src, "inventory_daily"):
        parts = []
        lost_parts = []
        for ch in pd.read_csv(src / "inventory_daily.csv", usecols=["date", "store_id", "product_id", "closing_qty", "on_order_qty", "lost_demand"], chunksize=500_000):
            ch["date"] = pd.to_datetime(ch["date"])
            ch = ch[ch["date"] >= asof - pd.Timedelta(days=6)]
            if len(ch):
                parts.append(ch)
        inv = pd.concat(parts)
        inv_last = inv[inv["date"] == asof].set_index(["store_id", "product_id"])
        lost7 = inv.groupby(["store_id", "product_id"])["lost_demand"].sum()
    lots["received_date"] = pd.to_datetime(lots["received_date"])
    lots["expiration_date"] = pd.to_datetime(lots["expiration_date"])
    live = lots[(lots["received_date"] <= asof) & (lots["expiration_date"] >= asof) & (lots["quantity_remaining"] > 0)]
    lot_qty = live.groupby(["store_id", "product_id"])["quantity_remaining"].sum()
    lot_exp = live.groupby(["store_id", "product_id"])["expiration_date"].min()

    po["order_date"] = pd.to_datetime(po["order_date"])
    po["expected_delivery_date"] = pd.to_datetime(po["expected_delivery_date"])
    open_po = po[po["actual_delivery_date"].isna()]
    open_qty = open_po.groupby(["store_id", "product_id"])["quantity"].sum()
    open_eta = open_po.groupby(["store_id", "product_id"])["expected_delivery_date"].min()
    open_n = open_po.groupby(["store_id", "product_id"]).size()
    last_po = po.sort_values("order_date").groupby(["store_id", "product_id"]).tail(1).set_index(["store_id", "product_id"])

    prod_ix = products.set_index("product_id")
    med_lead = offers.groupby("product_id")["lead_time_days"].median()
    rows = []
    for s in store_ids:
        for p in product_ids:
            k = (s, p)
            qty = int(inv_last.loc[k, "closing_qty"]) if inv_last is not None and k in inv_last.index else int(lot_qty.get(k, 0))
            pred = float(last_po.loc[k, "predicted_daily_demand"]) if k in last_po.index else mean14[k]
            shelf = int(prod_ix.loc[p, "shelf_life_days"])
            safety = SAFETY_PERISHABLE if shelf <= PERISHABLE_MAX_SHELF else SAFETY_STABLE
            rop = math.ceil(pred * (float(med_lead.get(p, 2)) + safety))
            exp = lot_exp.get(k)
            on_order = int(inv_last.loc[k, "on_order_qty"]) if inv_last is not None and k in inv_last.index else int(open_qty.get(k, 0))
            rows.append([s, p, qty, int(open_qty.get(k, on_order)), open_n.get(k, 0) and int(open_n.get(k)),
                         str(open_eta[k].date()) if k in open_eta.index else None,
                         str(exp.date()) if exp is not None and not pd.isna(exp) else None,
                         round(pred, 2), rop,
                         round(mean14[k], 2),
                         int(lost7.get(k, 0)) if inv_last is not None else 0])
    dump(out, "stock", {"asOf": str(asof.date()),
                        "columns": ["store_id", "product_id", "quantity", "on_order_qty", "open_orders", "next_eta",
                                    "earliest_expiry", "predicted_daily_demand", "reorder_point", "avg_daily_units_14d",
                                    "lost_demand_7d"],
                        "rows": rows})

    # ---- tickets -------------------------------------------------------------
    tk_note = None
    if has(src, "ticket_lines"):
        win_start = asof - pd.Timedelta(days=59)
        tl_parts = []
        for ch in pd.read_csv(src / "ticket_lines.csv", usecols=["ticket_id", "date", "store_id", "product_id", "quantity", "net_amount"], chunksize=500_000):
            ch["date"] = pd.to_datetime(ch["date"])
            ch = ch[ch["date"] >= win_start]
            if len(ch):
                tl_parts.append(ch)
        tl = pd.concat(tl_parts, ignore_index=True)
        tk = tl.groupby(["store_id", "date", "ticket_id"], observed=True).agg(net=("net_amount", "sum"), items=("quantity", "sum")).reset_index()

        def rng_stats(df, lo, hi):
            d = df[(df["date"] > asof - pd.Timedelta(days=hi)) & (df["date"] <= asof - pd.Timedelta(days=lo))]
            return d

        kpis = {}
        scopes = {"ALL": tk}
        scopes.update({s: tk[tk["store_id"] == s] for s in store_ids})
        for sc, df in scopes.items():
            kpis[sc] = {}
            for days in (7, 30):
                cur, prev = rng_stats(df, 0, days), rng_stats(df, days, days * 2)
                def agg(d):
                    n = len(d)
                    return {"tickets": n, "averageTicket": round(float(d["net"].mean()), 2) if n else None,
                            "itemsPerTicket": round(float(d["items"].mean()), 2) if n else None}
                c, pv = agg(cur), agg(prev)
                delta = None
                if c["averageTicket"] and pv["averageTicket"]:
                    delta = round((c["averageTicket"] / pv["averageTicket"] - 1) * 100, 2)
                kpis[sc][f"last{days}"] = {**c, "previous": pv, "deltaPct": delta}
        dump(out, "ticket_kpis", {"asOf": str(asof.date()), "note": "net ticket value and items per ticket; previous = same-length window before",
                                  "scopes": kpis})

        # affinity: last 30 days, product pairs within the same ticket
        a30 = tl[tl["date"] > asof - pd.Timedelta(days=30)]
        baskets = a30.groupby("ticket_id")["product_id"].agg(lambda x: sorted(set(x)))
        multi = baskets[baskets.map(len) > 1]
        total = len(baskets)
        pair_all: Counter = Counter()
        prod_count: Counter = Counter()
        for items in baskets:
            prod_count.update(items)
        for items in multi:
            pair_all.update(itertools.combinations(items[:12], 2))
        ticket_store = a30.drop_duplicates("ticket_id").set_index("ticket_id")["store_id"]
        pair_store: dict[str, Counter] = {s: Counter() for s in store_ids}
        tot_store: Counter = Counter(ticket_store.reindex(baskets.index))
        for tid, items in multi.items():
            pair_store[ticket_store[tid]].update(itertools.combinations(items[:12], 2))

        def top(counter: Counter, n_tickets: int, k: int):
            res = []
            for (a, b), c in counter.most_common(k):
                lift = (c / n_tickets) / ((prod_count[a] / total) * (prod_count[b] / total)) if prod_count[a] and prod_count[b] else None
                res.append({"a": a, "b": b, "tickets": c, "pctTickets": round(100 * c / n_tickets, 3),
                            "lift": round(lift, 2) if lift else None})
            return res

        dump(out, "affinity", {"asOf": str(asof.date()), "windowDays": 30, "tickets": total,
                               "chain": top(pair_all, total, 60),
                               "byStore": {s: top(pair_store[s], tot_store[s] or 1, 15) for s in store_ids}})
        tk_note = "ticket_lines"
    else:
        # seed: deterministic ticket KPIs from sales net_revenue / units (no tickets)
        tk_note = "seed"
        kp = {}
        net = sales.copy()
        for sc in ["ALL"] + store_ids:
            df = net if sc == "ALL" else net[net["store_id"] == sc]
            kp[sc] = {}
            for days in (7, 30):
                cur = df[df["date"] > asof - pd.Timedelta(days=days)]
                prev = df[(df["date"] <= asof - pd.Timedelta(days=days)) & (df["date"] > asof - pd.Timedelta(days=days * 2))]
                def ag(d):
                    items = d["units_sold"].sum()
                    revenue = d["net_revenue"].sum() if "net_revenue" in d else 0
                    return {"tickets": None, "averageTicket": round(float(revenue / max(1, items)) * 3.2, 2),
                            "itemsPerTicket": 3.2}
                c, pv = ag(cur), ag(prev)
                kp[sc][f"last{days}"] = {**c, "previous": pv,
                                         "deltaPct": round((c["averageTicket"] / pv["averageTicket"] - 1) * 100, 2) if pv["averageTicket"] else None}
        dump(out, "ticket_kpis", {"asOf": str(asof.date()), "seed": True, "scopes": kp})
        dump(out, "affinity", {"asOf": str(asof.date()), "seed": True, "windowDays": 30, "tickets": 0, "chain": [], "byStore": {}})

    # ---- catalogs ------------------------------------------------------------
    dump(out, "stores", records(stores))
    dump(out, "zones", records(zones))
    dump(out, "categories", records(categories))
    dump(out, "products", records(products))
    dump(out, "suppliers", records(suppliers))
    dump(out, "supplier_offers", records(offers))

    # ---- calendar + forecast_context ----------------------------------------
    cal_lo = asof - pd.Timedelta(days=CALENDAR_PAST_DAYS - 1)
    cal = calendar[calendar["date"] >= cal_lo].merge(weather.assign(date=pd.to_datetime(weather["date"])), on="date", how="left")
    cal["date"] = cal["date"].dt.strftime("%Y-%m-%d")
    cal["kind"] = "history"
    if has(src, "forecast_context"):
        fc = rd(src, "forecast_context")
        fc["kind"] = "forecast_context"
        cal = pd.concat([cal, fc], ignore_index=True)
        fc_note = "forecast_context.csv"
    else:
        # seed: derive 14 future days deterministically from the same day last year
        fut = pd.date_range(asof + pd.Timedelta(days=1), periods=FORECAST_DAYS, freq="D")
        calw = calendar.merge(weather.assign(date=pd.to_datetime(weather["date"])), on="date", how="left").set_index("date")
        frows = []
        for d in fut:
            ref = d - pd.DateOffset(years=1)
            r = calw.loc[ref].copy() if ref in calw.index else calw.iloc[-1].copy()
            r["date"] = d.strftime("%Y-%m-%d")
            r["day_of_week"] = d.day_name()
            r["is_weekend"] = int(d.dayofweek >= 5)
            r["is_payday"] = int(d.day == 15 or (d + pd.Timedelta(days=1)).day == 1)
            r["kind"] = "forecast_context"
            frows.append(r)
        cal = pd.concat([cal, pd.DataFrame(frows)], ignore_index=True)
        fc_note = "seed (same day last year)"
    dump(out, "calendar", table(cal))

    # ---- campaigns -----------------------------------------------------------
    camps_out = []
    if has(src, "promotion_campaigns"):
        camps = rd(src, "promotion_campaigns")
        psd = rd(src, "promotion_store_days")
        sd = psd.groupby("campaign_id").agg(
            stores_treatment=("store_id", lambda x: x[psd.loc[x.index, "is_treatment"] == 1].nunique()),
            stores_control=("store_id", lambda x: x[psd.loc[x.index, "is_treatment"] == 0].nunique()),
            store_days=("store_id", "size"),
            treatment_days=("is_treatment", "sum"))
        # observed lift in the 44-day window only (campaigns older than the window have none)
        for r in camps.to_dict("records"):
            row = {k: nn(v) for k, v in r.items()}
            row.update({k: nn(v) for k, v in (sd.loc[r["campaign_id"]].to_dict() if r["campaign_id"] in sd.index else {}).items()})
            camps_out.append(row)
        # observed uplift of the promoted SKU, treatment vs control, from sales.csv (full history)
        full_sales = []
        for ch in pd.read_csv(sales_path, usecols=["date", "store_id", "product_id", "units_sold"], chunksize=500_000):
            ch = ch[ch["product_id"].isin(camps["promoted_product_id"].unique())]
            full_sales.append(ch)
        fs = pd.concat(full_sales, ignore_index=True)
        fs["date"] = pd.to_datetime(fs["date"])
        psd["date"] = pd.to_datetime(psd["date"])
        lift = {}
        for r in camps.to_dict("records"):
            m = psd[(psd["campaign_id"] == r["campaign_id"]) & (psd["is_eligible"] == 1)]
            j = m.merge(fs[fs["product_id"] == r["promoted_product_id"]], on=["date", "store_id"], how="left")
            t = j[j["is_treatment"] == 1]["units_sold"].mean()
            c = j[j["is_treatment"] == 0]["units_sold"].mean()
            lift[r["campaign_id"]] = (nn(round(t, 3)) if pd.notna(t) else None, nn(round(c, 3)) if pd.notna(c) else None)
        for row in camps_out:
            t, c = lift[row["campaign_id"]]
            row["avg_units_treatment"], row["avg_units_control"] = t, c
            row["observed_lift_pct"] = round((t / c - 1) * 100, 1) if t and c else None
    dump(out, "campaigns", camps_out)

    # ---- meta ----------------------------------------------------------------
    dump(out, "meta", {
        "data_as_of": str(asof.date()),
        "history_start": str(calendar["date"].min().date()),
        "history_end": str(asof.date()),
        "forecast_start": str((asof + pd.Timedelta(days=1)).date()),
        "forecast_end": str((asof + pd.Timedelta(days=FORECAST_DAYS)).date()),
        "sales_window_days": SALES_DAYS,
        "currency": "MXN",
        "source": "generator" if full else "seed",
        "tickets": tk_note,
        "forecast_context": fc_note,
        "counts": {"stores": len(stores), "zones": len(zones), "categories": len(categories), "products": len(products),
                   "suppliers": len(suppliers), "supplier_offers": len(offers), "campaigns": len(camps_out)},
    })

    total = 0
    for f in sorted(out.glob("*.json")):
        size = f.stat().st_size
        total += size
        print(f"  {f.name:22s} {size / 1024:9.1f} KB")
    print(f"  TOTAL {total / 1e6:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
