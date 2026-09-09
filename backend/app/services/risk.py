from dataclasses import dataclass
from app.models.battery import Battery
from app.models.forecast import ForecastPoint


@dataclass(frozen=True)
class EffectivePrice:
    buy: float
    sell: float


def effective_prices(battery: Battery, point: ForecastPoint) -> EffectivePrice:
    """Transparent quantile heuristics, not an inferred expected distribution or CVaR."""
    if battery.risk_profile == "conservative":
        return EffectivePrice(
            0.75 * point.p90 + 0.25 * point.p50, 0.75 * point.p10 + 0.25 * point.p50
        )
    if battery.risk_profile == "aggressive":
        w = battery.aggressive_weight
        return EffectivePrice(
            (1 - w) * point.p50 + w * point.p10, (1 - w) * point.p50 + w * point.p90
        )
    return EffectivePrice(point.p50, point.p50)
