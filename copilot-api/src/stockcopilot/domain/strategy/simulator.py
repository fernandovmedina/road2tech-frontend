"""Deterministic simulator: baseline vs treated scenario for one candidate (no LLM involved).

Both scenarios run the same FEFO inventory projection from today's position, orders in transit
and the store's standing reorder rule. The treated scenario changes demand only on promotion days. The window extends
`POST_PROMO_DAYS` past the promotion so lots that expire right after it count as waste.

    margin              = revenue - unit_cost x units_sold
    expected_net_impact = margin increment + (waste avoided x unit_cost)

Waste avoided is added back because those units were already paid for: selling them is worth
their full price, not price minus cost.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np

from ..inventory import ProductPosition, ProjectionResult, ReorderPolicy, project_inventory
from ..models import RiskLevel
from .candidates import COMBO_CANNIBALIZATION, Candidate, attach_rate

POST_PROMO_DAYS = 7


@dataclass(frozen=True)
class SimulationContext:
    start: date  # first simulated day (as_of + 1)
    promo_offset: int  # index of the first promotion day
    period_days: int
    price: float
    unit_cost: float
    shelf_life_days: int
    elasticity: float
    position: ProductPosition
    p50: np.ndarray  # target demand, length >= promo_offset + period_days + POST_PROMO_DAYS
    p80: np.ndarray
    anchor_p50: np.ndarray | None  # anchor product demand for combos, same length
    policy: ReorderPolicy | None = None  # the store keeps reordering as usual in both scenarios

    @property
    def horizon(self) -> int:
        return self.promo_offset + self.period_days + POST_PROMO_DAYS

    def promo_mask(self) -> np.ndarray:
        mask = np.zeros(self.horizon, dtype=bool)
        mask[self.promo_offset : self.promo_offset + self.period_days] = True
        return mask


@dataclass
class Scenario:
    projection: ProjectionResult
    revenue: np.ndarray
    margin: np.ndarray

    @property
    def units(self) -> float:
        return self.projection.total_sold

    @property
    def total_revenue(self) -> float:
        return float(self.revenue.sum())

    @property
    def total_margin(self) -> float:
        return float(self.margin.sum())

    @property
    def waste(self) -> float:
        return self.projection.total_waste


@dataclass
class SimulationResult:
    candidate: Candidate
    baseline: Scenario
    treated: Scenario
    units_increment: float
    sales_increment: float
    margin_increment: float
    waste_reduction: float
    waste_reduction_value: float
    net_impact: float
    net_impact_low: float
    net_impact_high: float
    stockout_risk: RiskLevel
    extra_lost_units: float


def _treated_demand(
    candidate: Candidate, ctx: SimulationContext, base: np.ndarray, effect: float
) -> tuple[np.ndarray, np.ndarray]:
    """Demand with the strategy, and the share of each day's units sold at the discounted price."""
    mask = ctx.promo_mask()
    d = candidate.discount_pct / 100
    demand = base.copy()
    discounted_share = np.zeros(ctx.horizon)
    if not candidate.is_combo:
        lift = (1 - d) ** (-ctx.elasticity * effect)
        demand[mask] = base[mask] * lift
        discounted_share[mask] = 1.0
    else:
        anchor = ctx.anchor_p50 if ctx.anchor_p50 is not None else np.zeros(ctx.horizon)
        extra = anchor * attach_rate(candidate.discount_pct) * effect
        demand[mask] = base[mask] + extra[mask]
        with np.errstate(divide="ignore", invalid="ignore"):
            share = (extra + COMBO_CANNIBALIZATION * base) / np.maximum(demand, 1e-9)
        discounted_share[mask] = np.clip(share[mask], 0, 1)
    return demand, discounted_share


def _extra_baseline_lost(
    ctx: SimulationContext,
    base: np.ndarray,
    treated_demand: np.ndarray,
    baseline: ProjectionResult,
    treated: ProjectionResult,
) -> float:
    """Baseline shoppers left without product in the treated scenario (proportional rationing)."""
    with np.errstate(divide="ignore", invalid="ignore"):
        share = np.where(treated_demand > 0, base / treated_demand, 0.0)
    return float((treated.lost_units * share).sum() - baseline.lost_units.sum())


def _scenario(ctx: SimulationContext, demand: np.ndarray, discount: float, discounted_share: np.ndarray) -> Scenario:
    projection = project_inventory(ctx.position, ctx.start, demand, ctx.shelf_life_days, policy=ctx.policy)
    unit_price = ctx.price * (1 - discount * discounted_share)
    revenue = projection.units_sold * unit_price
    margin = revenue - projection.units_sold * ctx.unit_cost
    return Scenario(projection=projection, revenue=revenue, margin=margin)


def simulate(candidate: Candidate, ctx: SimulationContext) -> SimulationResult:
    horizon = ctx.horizon
    base_p50 = ctx.p50[:horizon]
    base_p80 = ctx.p80[:horizon]
    d = candidate.discount_pct / 100
    zero = np.zeros(horizon)

    baseline = _scenario(ctx, base_p50, 0.0, zero)
    demand, share = _treated_demand(candidate, ctx, base_p50, 1.0)
    treated = _scenario(ctx, demand, d, share)

    def net(effect: float) -> float:
        dem, sh = _treated_demand(candidate, ctx, base_p50, effect)
        scen = _scenario(ctx, dem, d, sh)
        return (scen.total_margin - baseline.total_margin) + (baseline.waste - scen.waste) * ctx.unit_cost

    waste_reduction = baseline.waste - treated.waste
    margin_increment = treated.total_margin - baseline.total_margin
    net_impact = margin_increment + waste_reduction * ctx.unit_cost
    # Stock limits make the effect non-monotonic, so the range always includes the point estimate.
    scenarios = [net(0.6), net_impact, net(1.4)]
    bounds = (min(scenarios), max(scenarios))

    # Run-out risk: shoppers who would have bought anyway (baseline demand) but find an empty
    # shelf because the promotion sold the stock first. Unserved promo-only demand is not a loss.
    extra_p50 = _extra_baseline_lost(ctx, base_p50, demand, baseline.projection, treated.projection)
    demand_p80, _ = _treated_demand(candidate, ctx, base_p80, 1.0)
    extra_p80 = _extra_baseline_lost(
        ctx,
        base_p80,
        demand_p80,
        project_inventory(ctx.position, ctx.start, base_p80, ctx.shelf_life_days, policy=ctx.policy),
        project_inventory(ctx.position, ctx.start, demand_p80, ctx.shelf_life_days, policy=ctx.policy),
    )
    window_demand = float(base_p50.sum())
    if extra_p50 > max(1.0, 0.05 * window_demand):
        risk: RiskLevel = "high"
    elif extra_p80 > max(1.0, 0.03 * window_demand):
        risk = "medium"
    else:
        risk = "low"

    return SimulationResult(
        candidate=candidate,
        baseline=baseline,
        treated=treated,
        units_increment=treated.units - baseline.units,
        sales_increment=treated.total_revenue - baseline.total_revenue,
        margin_increment=margin_increment,
        waste_reduction=waste_reduction,
        waste_reduction_value=waste_reduction * ctx.unit_cost,
        net_impact=net_impact,
        net_impact_low=bounds[0],
        net_impact_high=bounds[1],
        stockout_risk=risk,
        extra_lost_units=max(0.0, extra_p50),
    )


def series_dates(ctx: SimulationContext) -> list[date]:
    return [ctx.start + timedelta(days=k) for k in range(ctx.horizon)]
