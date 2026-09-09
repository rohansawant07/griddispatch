import csv
import pytest
from app.models.dispatch import CompareRequest, BaselinePoint
from app.providers.synthetic import DATA
from app.services.comparison import compare
from app.services.accounting import evaluate_schedule


def baseline():
    with (DATA / "baseline_schedule.csv").open() as f:
        return [BaselinePoint.model_validate(r) for r in csv.DictReader(f)]


def test_shadow_same_constraints(battery, forecast):
    result = compare(
        CompareRequest(battery=battery, forecast=forecast, baseline=baseline())
    )
    rows = result["baseline"]["schedule"]
    assert all(battery.min_soc <= r.soc_after <= battery.max_soc for r in rows)
    assert result["baseline"]["summary"].ending_soc == pytest.approx(
        battery.initial_soc
    )
    assert result["estimated_difference"] >= 0
    assert result["differing_intervals"]


@pytest.mark.parametrize(
    "kind", ["power", "soc", "cycle", "terminal", "timestamp", "hold"]
)
def test_invalid_baseline_is_rejected(battery, forecast, kind):
    plan = baseline()
    if kind == "power":
        plan[4].power_mw = 101
    if kind == "soc":
        battery = battery.model_copy(update={"initial_soc": 0.94})
    if kind == "cycle":
        battery = battery.model_copy(update={"max_cycles_per_day": 0})
    if kind == "terminal":
        plan[68].power_mw = 0
    if kind == "timestamp":
        plan[0].timestamp = plan[1].timestamp
    if kind == "hold":
        plan[0].power_mw = 1
    with pytest.raises(ValueError):
        compare(CompareRequest(battery=battery, forecast=forecast, baseline=plan))


def test_shared_evaluator_rejects_simultaneous(battery, forecast):
    with pytest.raises(ValueError, match="simultaneous"):
        evaluate_schedule(battery, forecast, [(10, 10)] * 96)
