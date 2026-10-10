# Sample data (lib/mock/data)

Origin: real run of the backend generator (`BackendRoad2Tech/scripts/dataset/run_all.py`, seed 42), executed on a COPY of the backend repo (the generator overwrites its own versioned CSVs). `meta.json` -> `source: "generator"`.

Regenerate:

    # in a copy of the backend repo
    python scripts/dataset/run_all.py          # ~15-25 min, writes public/softtek/dataset/dataset-hackathon-road2tech/v2/*.csv (~1 GB)
    # in this repo (needs pandas + numpy)
    python scripts/extract-sample-data.py <path-to-v2-csv-folder> [lib/mock/data]

CSVs are never versioned (`*.csv` is git-ignored). Total JSON < 1 MB.

Real (taken as-is from the generator): stores, zones, categories, products, suppliers, supplier_offers, sales_daily (last 44 days, 25x120 series), current stock (inventory_daily last day), on-order/in-transit (purchase_orders without actual delivery), earliest_expiry (inventory_lots), ticket KPIs and affinity pairs (ticket_lines), calendar + weather (last 60 days), forecast_context (14 days), campaigns with treatment/control counts and observed units.

Derived (documented approximations):
- `stock.reorder_point` = ceil(predicted_daily_demand of the latest purchase order x (median supplier lead time of the product + safety days)); safety = 1 day if shelf life <= 30 else 3 (same policy as the generator).
- `stock.avg_daily_units_14d`, `lost_demand_7d`: from sales / inventory_daily.
- `ticket_kpis`: net ticket value and items per ticket over the last 7/30 days vs the previous window of equal length.
- `affinity`: product pairs sharing a ticket in the last 30 days (`pctTickets` = % of tickets in scope, `lift` = observed / expected under independence). Basket pairs use at most the first 12 distinct products of a ticket.
- `campaigns.avg_units_treatment/control/observed_lift_pct`: mean units/store-day of the promoted SKU, treatment vs control, over the campaign's eligible store-days.

Not in the dataset (must come from the backend/ML): P50/P80/P90 forecasts, proposed discount, strategies/plan, lost-sales-if-skipped estimates.
