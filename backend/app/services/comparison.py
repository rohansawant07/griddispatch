from app.models.dispatch import OptimizeRequest
from app.services.application import run_dispatch, resolve_battery
from app.services.accounting import evaluate_schedule


def compare(request):
    battery = resolve_battery(request)
    if len(request.baseline) != len(request.forecast):
        raise ValueError("baseline must cover every forecast interval")
    powers = []
    for i, (entry, point) in enumerate(zip(request.baseline, request.forecast)):
        if entry.timestamp != point.timestamp:
            raise ValueError(f"baseline timestamp mismatch at interval {i}")
        if entry.action == "HOLD" and entry.power_mw != 0:
            raise ValueError(f"baseline HOLD must have zero power at interval {i}")
        powers.append(
            (
                entry.power_mw if entry.action == "CHARGE" else 0,
                entry.power_mw if entry.action == "DISCHARGE" else 0,
            )
        )
    baseline_rows, baseline_summary = evaluate_schedule(
        battery, request.forecast, powers
    )
    recommended = run_dispatch(request)
    differences = [
        i
        for i, (a, b) in enumerate(zip(baseline_rows, recommended.schedule))
        if a.action != b.action or abs(a.power_mw - b.power_mw) > 1e-4
    ]
    return {
        "baseline": {"summary": baseline_summary, "schedule": baseline_rows},
        "recommended": recommended,
        "estimated_difference": recommended.summary.estimated_gross_value
        - baseline_summary.estimated_gross_value,
        "differing_intervals": differences,
    }


def scenarios(request):
    return {
        risk: run_dispatch(
            OptimizeRequest(
                battery=request.battery, forecast=request.forecast, risk_profile=risk
            )
        ).summary
        for risk in ["conservative", "neutral", "aggressive"]
    }
