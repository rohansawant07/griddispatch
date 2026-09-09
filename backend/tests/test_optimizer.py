import pytest
from app.services.optimizer import optimize
from app.models.battery import Battery


def test_low_then_high_economics(result):
    charging = [r for r in result.schedule if r.action == "CHARGE"]
    discharge = [r for r in result.schedule if r.action == "DISCHARGE"]
    assert any(r.timestamp.hour < 6 for r in charging)
    assert any(16 <= r.timestamp.hour <= 19 for r in discharge)
    assert min(r.timestamp for r in charging) < max(r.timestamp for r in discharge)
    assert result.summary.estimated_gross_value > 0


def test_repeatable(battery, forecast, result):
    rows, summary = optimize(battery, forecast)
    assert [r.model_dump() for r in rows] == [r.model_dump() for r in result.schedule]
    assert summary == result.summary


def test_flat_prices_hold(forecast):
    points = [p.model_copy(update={"p10": 50, "p50": 50, "p90": 50}) for p in forecast]
    rows, summary = optimize(Battery(), points)
    assert summary.estimated_gross_value == pytest.approx(0, abs=1e-5)
    assert all(r.action == "HOLD" for r in rows)


def test_zero_prices_avoid_unnecessary_cycles(forecast):
    points = [p.model_copy(update={"p10": 0, "p50": 0, "p90": 0}) for p in forecast]
    rows, _ = optimize(Battery(), points)
    assert all(r.action == "HOLD" for r in rows)


def test_negative_prices_remain_physical(forecast):
    points = [
        p.model_copy(update={"p10": -30, "p50": -20, "p90": -10}) for p in forecast
    ]
    rows, summary = optimize(Battery(), points)
    assert all(min(r.charge_mw, r.discharge_mw) < 1e-6 for r in rows)
    assert summary.ending_soc == pytest.approx(0.54, abs=1e-6)
