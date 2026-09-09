import pytest
from app.models.dispatch import ExplainRequest
from app.services.application import explain_alternatives


def test_explanations_match_outputs(result):
    assert len(result.schedule) == len(result.explanations) == 96
    for row, ex in zip(result.schedule, result.explanations):
        assert ex.action == row.action
        assert ex.timestamp == row.timestamp == ex.forecast.timestamp
        assert ex.power_mw == row.power_mw
        assert ex.soc_after == row.soc_after
        assert ex.reason and ex.what_could_change and ex.decision_drivers
        if "Power rating" in ex.binding_constraints:
            assert row.power_mw == pytest.approx(100)
        if "SOC reserve floor (interval boundary)" in ex.binding_constraints:
            assert min(row.soc_before, row.soc_after) == pytest.approx(0.1, abs=1e-5)


def test_hold_has_qualitative_explanation(result):
    holds = [e for e in result.explanations if e.action == "HOLD"]
    assert holds
    assert all("threshold" in e.what_could_change for e in holds)


def test_counterfactual_uses_actual_resolve(battery, forecast):
    response = explain_alternatives(
        ExplainRequest(battery=battery, forecast=forecast, interval_index=40)
    )
    assert len(response["alternatives"]) == 2
    for alternative in response["alternatives"]:
        assert alternative["minimum_power_mw"] == 1
        if alternative["feasible"]:
            assert alternative["policy_value_loss"] >= 0


def test_counterfactual_zero_cycle_budget(battery, forecast):
    response = explain_alternatives(
        ExplainRequest(
            battery=battery.model_copy(update={"max_cycles_per_day": 0}),
            forecast=forecast,
            interval_index=40,
        )
    )
    assert all(not a["feasible"] for a in response["alternatives"])
