"""Build the small test fixture (tests/fixtures/v2) from the full Road2Tech v2 dataset.

    python scripts/make_fixture.py <path to .../dataset-hackathon-road2tech/v2>

Keeps 2 stores and 6 products over the full date range, so stock reconstruction stays exact.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

STORES = ["S001", "S016"]
PRODUCTS = ["P001", "P016", "P023", "P059", "P067", "P085"]
OUT = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "v2"


def main(source: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in ("zones", "categories", "calendar", "weather", "suppliers"):
        pd.read_csv(source / f"{name}.csv", dtype=str, keep_default_na=False).to_csv(OUT / f"{name}.csv", index=False)
    stores = pd.read_csv(source / "stores.csv", dtype=str, keep_default_na=False)
    stores[stores.store_id.isin(STORES)].to_csv(OUT / "stores.csv", index=False)
    for name in ("products", "supplier_products"):
        frame = pd.read_csv(source / f"{name}.csv", dtype=str, keep_default_na=False)
        frame[frame.product_id.isin(PRODUCTS)].to_csv(OUT / f"{name}.csv", index=False)
    for name in ("sales", "inventory_lots", "purchase_orders"):
        frame = pd.read_csv(source / f"{name}.csv", dtype=str, keep_default_na=False)
        frame[frame.store_id.isin(STORES) & frame.product_id.isin(PRODUCTS)].to_csv(OUT / f"{name}.csv", index=False)
    print(f"Fixture written to {OUT}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
