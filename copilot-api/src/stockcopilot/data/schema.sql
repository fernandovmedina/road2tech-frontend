-- StockCopilot PostgreSQL schema: the Road2Tech v2 dataset plus promotion drafts.
-- Load the CSVs with: python -m stockcopilot.data.load_postgres

CREATE TABLE IF NOT EXISTS zones (
    zone_type          TEXT PRIMARY KEY,
    description        TEXT NOT NULL,
    peak_hours         TEXT,
    weekend_multiplier NUMERIC(6, 3),
    notes              TEXT
);

CREATE TABLE IF NOT EXISTS stores (
    store_id            TEXT PRIMARY KEY,
    store_name          TEXT NOT NULL,
    colonia             TEXT NOT NULL,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    zone_type           TEXT NOT NULL REFERENCES zones (zone_type),
    secondary_zone_type TEXT REFERENCES zones (zone_type),
    size_category       TEXT NOT NULL,
    opening_hours       TEXT,
    is_24h              SMALLINT NOT NULL,
    opened_date         DATE
);

CREATE TABLE IF NOT EXISTS categories (
    category_id             TEXT PRIMARY KEY,
    category_name           TEXT NOT NULL,
    is_perishable           SMALLINT NOT NULL,
    typical_shelf_life_days INTEGER NOT NULL,
    requires_refrigeration  SMALLINT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    product_id          TEXT PRIMARY KEY,
    product_name        TEXT NOT NULL,
    category_id         TEXT NOT NULL REFERENCES categories (category_id),
    brand               TEXT NOT NULL,
    unit                TEXT NOT NULL,
    shelf_life_days     INTEGER NOT NULL,
    retail_price        NUMERIC(10, 2) NOT NULL,
    is_seasonal         SMALLINT NOT NULL,
    weather_sensitivity TEXT NOT NULL,
    base_daily_demand   NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id       TEXT PRIMARY KEY,
    supplier_name     TEXT NOT NULL,
    email             TEXT NOT NULL,
    categories_served TEXT NOT NULL,
    city              TEXT NOT NULL,
    reliability_score NUMERIC(4, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_products (
    supplier_id    TEXT NOT NULL REFERENCES suppliers (supplier_id),
    product_id     TEXT NOT NULL REFERENCES products (product_id),
    unit_cost      NUMERIC(10, 2) NOT NULL,
    min_order_qty  INTEGER NOT NULL,
    lead_time_days INTEGER NOT NULL,
    delivery_days  TEXT,
    PRIMARY KEY (supplier_id, product_id)
);

CREATE TABLE IF NOT EXISTS calendar (
    date                   DATE PRIMARY KEY,
    day_of_week            TEXT NOT NULL,
    is_weekend             SMALLINT NOT NULL,
    is_holiday             SMALLINT NOT NULL,
    holiday_name           TEXT,
    season_name            TEXT NOT NULL,
    event_name             TEXT,
    event_scope            TEXT,
    is_payday              SMALLINT NOT NULL,
    is_school_vacation     SMALLINT NOT NULL,
    is_college_vacation    SMALLINT NOT NULL,
    demand_multiplier_hint NUMERIC(6, 3) NOT NULL
);

CREATE TABLE IF NOT EXISTS weather (
    date             DATE PRIMARY KEY,
    temp_max_c       NUMERIC(5, 1) NOT NULL,
    temp_min_c       NUMERIC(5, 1) NOT NULL,
    precipitation_mm NUMERIC(6, 1) NOT NULL,
    weather_label    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
    date       DATE NOT NULL,
    store_id   TEXT NOT NULL REFERENCES stores (store_id),
    product_id TEXT NOT NULL REFERENCES products (product_id),
    units_sold INTEGER NOT NULL,
    revenue    NUMERIC(12, 2) NOT NULL,
    PRIMARY KEY (store_id, product_id, date)
);
CREATE INDEX IF NOT EXISTS sales_product_date_idx ON sales (product_id, date);

CREATE TABLE IF NOT EXISTS inventory_lots (
    lot_id             TEXT PRIMARY KEY,
    store_id           TEXT NOT NULL REFERENCES stores (store_id),
    product_id         TEXT NOT NULL REFERENCES products (product_id),
    supplier_id        TEXT NOT NULL REFERENCES suppliers (supplier_id),
    received_date      DATE NOT NULL,
    quantity_received  INTEGER NOT NULL,
    expiration_date    DATE NOT NULL,
    quantity_remaining INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS inventory_lots_store_received_idx ON inventory_lots (store_id, received_date);

CREATE TABLE IF NOT EXISTS purchase_orders (
    order_id               TEXT PRIMARY KEY,
    store_id               TEXT NOT NULL REFERENCES stores (store_id),
    product_id             TEXT NOT NULL REFERENCES products (product_id),
    supplier_id            TEXT NOT NULL REFERENCES suppliers (supplier_id),
    order_date             DATE NOT NULL,
    quantity               INTEGER NOT NULL,
    unit_cost              NUMERIC(10, 2) NOT NULL,
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date   DATE,
    is_urgent              SMALLINT NOT NULL,
    predicted_daily_demand NUMERIC(12, 4) NOT NULL,
    stock_at_order         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS purchase_orders_store_order_idx ON purchase_orders (store_id, order_date);

-- Promotion drafts created by the strategy engine; status changes only through user actions.
CREATE TABLE IF NOT EXISTS promotion_drafts (
    draft_id   TEXT PRIMARY KEY,
    store_id   TEXT NOT NULL,
    product_id TEXT NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('draft', 'selected', 'approved', 'rejected')),
    valid_from DATE NOT NULL,
    valid_to   DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    payload    JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS promotion_drafts_store_idx ON promotion_drafts (store_id, status);
