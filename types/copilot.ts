// Contracts returned by the Copilot API (mirror of BackendRoad2Tech services/copilot-api/src/stockcopilot/domain/models.py).
// Every number is computed by deterministic backend code; the UI only renders it.

export type RiskLevel = "low" | "medium" | "high";
export type Trend = "increasing" | "stable" | "decreasing";
export type StrategyType = "contextual_discount" | "rescue_combo" | "affinity_combo";
export type Objective = "increase_sales" | "reduce_waste" | "maximize_margin";
export type DraftStatus = "draft" | "selected" | "approved" | "rejected";
export type RestockReason = "stock_limit" | "demand" | "season";

export type StoreRef = {
  store_id: string;
  store_name: string;
  colonia: string;
  zone_type: string;
  secondary_zone_type: string | null;
  size_category: string;
  latitude: number;
  longitude: number;
};

export type ProductRef = {
  product_id: string;
  product_name: string;
  category_id: string;
  category_name: string;
  brand: string;
  unit: string;
  retail_price: number;
  shelf_life_days: number;
  is_perishable: boolean;
  weather_sensitivity: string;
};

export type SupplierRef = {
  supplier_id: string;
  supplier_name: string;
  email: string;
  city: string;
  reliability_score: number;
};

export type SeriesPoint = { date: string; value: number };
export type ForecastPoint = { date: string; p50: number; p80: number; p90: number };
export type Driver = { kind: string; name: string; impact_pct: number; detail: string };

export type StockoutRisk = {
  level: RiskLevel;
  score: number;
  days_of_cover: number | null;
  first_stockout_date: string | null;
  expected_lost_units: number;
  detail: string;
};

export type WasteRisk = {
  level: RiskLevel;
  score: number;
  expiring_units: number;
  expected_waste_units: number;
  expected_waste_value: number;
  detail: string;
};

export type ProductTendency = {
  kind: "product_tendency";
  store: StoreRef;
  product: ProductRef;
  data_as_of: string;
  history_days: number;
  forecast_days: number;
  historical_series: SeriesPoint[];
  forecast_series: ForecastPoint[];
  trend: Trend;
  trend_strength: number;
  trend_pct_per_week: number;
  recent_avg_daily_units: number;
  forecast_avg_daily_units: number;
  forecast_vs_recent_pct: number;
  main_drivers: Driver[];
  stockout_risk: StockoutRisk;
  waste_risk: WasteRisk;
  inventory: {
    on_hand: number;
    in_transit: number;
    next_delivery_date: string | null;
    lots: { expiration_date: string; quantity: number }[];
  };
  model: { name: string; backtest_wape_14d: number | null; source: string };
  ai_summary: string;
};

export type ScenarioPoint = {
  date: string;
  units: number;
  revenue: number;
  waste_units: number;
  in_promotion: boolean;
};

export type StrategyCandidate = {
  candidate_id: string;
  strategy_type: StrategyType;
  title: string;
  discount_pct: number;
  cross_sell_product: ProductRef | null;
  expected_units_increment: number;
  expected_sales_increment: number;
  expected_margin_increment: number;
  expected_waste_reduction: number;
  expected_net_impact: number;
  stockout_risk: RiskLevel;
  viable: boolean;
  violations: string[];
};

export type ProductSellStrategy = {
  kind: "product_sell_strategy";
  store: StoreRef;
  product: ProductRef;
  data_as_of: string;
  objective: Objective;
  recommended_action: string;
  strategy_type: StrategyType | null;
  discount_pct: number;
  cross_sell_product: ProductRef | null;
  cross_sell_basis: string | null;
  valid_from: string;
  valid_to: string;
  baseline_series: ScenarioPoint[];
  strategy_series: ScenarioPoint[];
  expected_units_increment: number;
  expected_sales_increment: number;
  expected_margin_increment: number;
  expected_waste_reduction: number;
  expected_waste_reduction_value: number;
  expected_net_impact: number;
  stockout_risk: RiskLevel;
  confidence_interval: { low: number; high: number; metric: string; basis: string };
  constraints: {
    max_discount_pct: number;
    min_unit_margin_pct: number;
    budget_mxn: number;
    period_days: number;
    max_stockout_risk: RiskLevel;
  };
  assumptions: string[];
  candidates: StrategyCandidate[];
  draft_id: string | null;
  draft_status: DraftStatus | null;
  requires_approval: boolean;
  expected_anchor_units_increment: number;
  uplift_source: "campaigns" | "assumed";
  disclaimer: string;
};

export type RestockSuggestion = {
  id: string;
  store_id: string;
  product: ProductRef;
  supplier: SupplierRef;
  suggested_qty: number;
  order_date: string;
  expected_arrival_date: string;
  lead_time_days: number;
  unit_cost: number;
  order_cost: number;
  is_urgent: boolean;
  on_hand: number;
  in_transit: number;
  predicted_daily_demand: number;
  days_of_cover: number | null;
  reorder_point: number;
  reasons: RestockReason[];
  reason_details: string[];
  status: "pending" | "approved" | "dismissed";
  email_draft: { to: string; subject: string; body: string };
};

export type RestockPlan = {
  kind: "restock_plan";
  store: StoreRef;
  data_as_of: string;
  checked_products: number;
  suggestions: RestockSuggestion[];
  notes: string[];
};

export type Mover = { product: ProductRef; recent_units: number; previous_units: number; change_pct: number };

export type Alert = {
  kind: "run_out" | "expiration" | "demand_spike" | "no_demand";
  severity: RiskLevel;
  product_id: string;
  product_name: string;
  date: string | null;
  message: string;
};

export type StoreOverview = {
  kind: "store_overview";
  store: StoreRef;
  data_as_of: string;
  period_from: string;
  period_to: string;
  kpis: {
    total_sales: number;
    total_sales_previous: number;
    sales_change_pct: number;
    units_sold: number;
    run_outs: number;
    no_demand: number;
    waste_risk_products: number;
  };
  daily_sales: SeriesPoint[];
  top_movers_up: Mover[];
  top_movers_down: Mover[];
  alerts: Alert[];
};

export type DemandByStore = {
  kind: "demand_by_store";
  product: ProductRef;
  data_as_of: string;
  days: number;
  network_recent_units: number;
  stores: {
    store: StoreRef;
    recent_units: number;
    previous_units: number;
    change_pct: number;
    forecast_next_7d_units: number;
  }[];
};

export type Portfolio = {
  kind: "portfolio";
  store: StoreRef;
  data_as_of: string;
  period_from: string;
  period_to: string;
  strategies: ProductSellStrategy[];
  net_expected_margin_increment: number;
  net_expected_impact: number;
  conflicts: string[];
  skipped: string[];
};

export type ProductSearch = { kind: "product_search"; query: string; products: ProductRef[] };

export type ToolError = { kind: "error"; message: string };

export type ToolResult =
  | ProductTendency
  | ProductSellStrategy
  | RestockPlan
  | StoreOverview
  | DemandByStore
  | Portfolio
  | ProductSearch
  | ToolError;

export type ApprovalRequest = {
  type: "promotion_approval";
  draft_id: string;
  title: string;
  store_name: string;
  product_name: string;
  valid_from: string;
  valid_to: string;
  discount_pct: number;
  expected_net_impact: number;
  expected_sales_increment: number;
  expected_waste_reduction: number;
  confidence_low: number;
  confidence_high: number;
  stockout_risk: RiskLevel;
};

export type ApprovalDecision = { decision: "approve" | "reject" | "later"; note?: string };

export type ApiEnvelope<T> = { request_id: string; data_as_of: string; data: T };
export type ApiError = { code: string; message: string; request_id: string };
