import pytest
from app.models.battery import Battery
from app.services.risk import effective_prices
from app.services.optimizer import optimize


def test_transparent_policy(forecast):
    p = forecast[72]
    conservative = effective_prices(Battery(risk_profile="conservative"), p)
    neutral = effective_prices(Battery(), p)
    aggressive = effective_prices(
        Battery(risk_profile="aggressive", aggressive_weight=0.4), p
    )
    assert conservative.buy == pytest.approx(0.75 * p.p90 + 0.25 * p.p50)
    assert conservative.sell == pytest.approx(0.75 * p.p10 + 0.25 * p.p50)
    assert aggressive.sell == pytest.approx(0.6 * p.p50 + 0.4 * p.p90)
    assert aggressive.buy < neutral.buy < conservative.buy
    assert conservative.sell < neutral.sell < aggressive.sell


def test_uncertainty_changes_behavior(forecast):
    # Same median at all times. Extreme uncertainty is an opportunity only under upside pricing.
    points = [p.model_copy(update={"p10": 0, "p50": 50, "p90": 200}) for p in forecast]
    c, cs = optimize(Battery(risk_profile="conservative"), points)
    a, ags = optimize(Battery(risk_profile="aggressive"), points)
    assert cs.dispatch_intervals == 0
    assert ags.dispatch_intervals > 0
    assert [r.action for r in c] != [r.action for r in a]


def test_zero_aggressive_weight_matches_neutral(forecast):
    a, ags = optimize(Battery(risk_profile="aggressive", aggressive_weight=0), forecast)
    n, ns = optimize(Battery(), forecast)
    assert ags == ns
    assert [(r.charge_mw, r.discharge_mw) for r in a] == [
        (r.charge_mw, r.discharge_mw) for r in n
    ]
