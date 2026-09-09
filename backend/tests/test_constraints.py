import pytest
from app.models.battery import Battery
from app.services.optimizer import optimize
from app.services.accounting import DT


def test_soc_maximum(result, battery):
    assert all(r.soc_after <= battery.max_soc + 1e-6 for r in result.schedule)


def test_soc_minimum(result, battery):
    assert all(r.soc_after >= battery.min_soc - 1e-6 for r in result.schedule)


def test_charge_power(result, battery):
    assert all(0 <= r.charge_mw <= battery.power_mw + 1e-6 for r in result.schedule)


def test_discharge_power(result, battery):
    assert all(0 <= r.discharge_mw <= battery.power_mw + 1e-6 for r in result.schedule)


def test_exclusivity(result):
    assert all(min(r.charge_mw, r.discharge_mw) < 1e-6 for r in result.schedule)


def test_efficiency_conservation(result, battery):
    for row in result.schedule:
        predicted = (
            row.soc_before
            + DT
            * (
                row.charge_mw * battery.charge_efficiency
                - row.discharge_mw / battery.discharge_efficiency
            )
            / battery.energy_mwh
        )
        assert row.soc_after == pytest.approx(predicted, abs=1e-8)
    assert result.summary.ending_soc == pytest.approx(battery.initial_soc, abs=1e-6)


@pytest.mark.parametrize("limit", [0, 0.1, 0.5, 1.5])
def test_cycle_limit(forecast, limit):
    battery = Battery(max_cycles_per_day=limit)
    rows, summary = optimize(battery, forecast)
    cycles = sum(
        (
            r.energy_charged_mwh * battery.charge_efficiency
            + r.energy_discharged_mwh / battery.discharge_efficiency
        )
        for r in rows
    ) / (2 * battery.energy_mwh)
    assert cycles <= limit + 1e-6
    assert cycles == pytest.approx(summary.equivalent_cycles)
    if limit == 0:
        assert all(r.action == "HOLD" for r in rows)


@pytest.mark.parametrize("soc", [0.1, 0.95])
def test_initial_soc_on_boundary(forecast, soc):
    rows, summary = optimize(Battery(initial_soc=soc), forecast)
    assert min(r.soc_after for r in rows) >= 0.1 - 1e-6
    assert max(r.soc_after for r in rows) <= 0.95 + 1e-6
    assert summary.ending_soc == pytest.approx(soc, abs=1e-6)


@pytest.mark.parametrize(
    "fields",
    [
        {"power_mw": 0},
        {"energy_mwh": -1},
        {"initial_soc": 0.99},
        {"min_soc": 0.96},
        {"charge_efficiency": 1.1},
        {"discharge_efficiency": 0},
        {"max_cycles_per_day": -1},
        {"power_mw": float("nan")},
        {"energy_mwh": float("inf")},
        {"risk_profile": "unknown"},
        {"min_soc": 0.95, "max_soc": 0.95},
    ],
)
def test_invalid_battery(fields):
    with pytest.raises(ValueError):
        Battery(**fields)
