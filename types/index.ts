// Provisional domain contracts. TODO(backend): align with the real API/DB models once defined.

export type AuthUser = { id: string; name: string; email: string };
export type Session = { user: AuthUser; token: string };

export type Branch = { id: string; name: string; lat: number; lng: number };

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplierId: string;
  unitCost: number;
  price: number;
  caseSize: number;
  shelfLifeDays: number;
  minStock: number;
  maxStock: number;
};

export type Supplier = {
  id: string;
  name: string;
  email: string;
  leadTimeDays: number;
  deliveryDays: string;
  minOrderValue: number;
  fillRate: number; // 0..1
};

export type Kpis = {
  averageTicket: number;
  averageTicketDeltaPct: number;
  stockouts: number;
  noDemand: number;
  aiOpportunity: number; // MXN
};

export type TrendPoint = { date: string; value: number; kind: "history" | "forecast" | "forecast_promo" };

export type BranchHeat = { branchId: string; productId: string | null; movement: number }; // 0..100

export type StockStatus = "out" | "low" | "ok" | "over";
export type StockItem = {
  productId: string;
  branchId: string;
  quantity: number;
  coverageDays: number;
  status: StockStatus;
  nextRestock: string | null;
};

export type BehaviorInsight = {
  id: string;
  kind: "crosssell" | "waste" | "demand";
  title: string;
  text: string;
  estimatedGain: number;
  productId: string;
};

export type PromoScenario = {
  unitsSold: number;
  revenue: number;
  margin: number;
  wasteUnits: number;
  wasteCost: number;
  crossSellRevenue: number;
  giveawayCost: number;
  netProfit: number;
};

export type PromoDriver = "demand" | "weather" | "event" | "season" | "shelf_life" | "bought_together";

export type PromoLine = {
  productId: string;
  role: "single" | "anchor" | "reward";
  qty: number;          // anchor: units to buy (model decides); reward/single: 1
  discountPct: number;  // anchor: model decides; reward: adjustable 0..100; single: 0..40
};

export type PromoSuggestion = {
  id: string;
  branchId: string;
  title: string;
  kind: "single" | "bundle";
  lines: PromoLine[];              // single = 1 line; bundle = anchor + reward
  discountPct: number;             // current adjustable discount (single discount or reward discount)
  optimalDiscountPct: number;      // model's suggested adjustable discount
  startDate: string;
  endDate: string;
  drivers: PromoDriver[];
  withoutPromo: PromoScenario;
  withPromo: PromoScenario;
  status: "pending" | "accepted" | "dismissed";
};

export type RestockReason = "below_min" | "demand_spike" | "stockout" | "season";
export type RestockSuggestion = {
  id: string;
  productId: string;
  branchId: string;
  supplierId: string;
  suggestedQty: number;
  suggestedDate: string;
  reasons: RestockReason[];
  expectedLostSalesIfSkipped: number;
  expectedGainIfOrdered: number;
};
export type RestockOrder = {
  id: string;
  suggestionId: string;
  qty: number;
  estimatedCost: number;
  status: "draft" | "sent";
  sentAt: string | null;
};

export type CalendarEvent = {
  id: string;
  date: string;
  kind: "delivery" | "promo" | "alert";
  label: string;
  productId?: string;
  branchId?: string;
};

export type ChatBlock =
  | { type: "text"; text: string }
  | { type: "trend_chart"; productId: string; branchId: string; points: TrendPoint[] }
  | { type: "restock_table"; suggestions: RestockSuggestion[] };
export type ChatMessage = { id: string; role: "user" | "assistant"; tool?: string; blocks: ChatBlock[] };

export type DataMode = "actual" | "forecast";
export type RangeKey = "last7" | "last30" | "next14" | "next30";
export type DemoState = "normal" | "empty" | "error";
