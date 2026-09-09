import hashlib
import json
from app.models.dispatch import DispatchResult
from app.services.optimizer import optimize, OptimizationError
from app.services.explanations import explain_schedule


def resolve_battery(request):
    return (
        request.battery.model_copy(update={"risk_profile": request.risk_profile})
        if request.risk_profile
        else request.battery
    )


def run_dispatch(request):
    battery = resolve_battery(request)
    rows, summary = optimize(battery, request.forecast)
    canonical = json.dumps(
        {
            "battery": battery.model_dump(mode="json"),
            "forecast": [p.model_dump(mode="json") for p in request.forecast],
        },
        sort_keys=True,
    )
    return DispatchResult(
        summary=summary,
        schedule=rows,
        explanations=explain_schedule(battery, request.forecast, rows, summary),
        audit={
            "input_sha256": hashlib.sha256(canonical.encode()).hexdigest(),
            "model_version": "1.0.0",
            "solver": "PuLP / CBC, single thread, seed 42",
            "status": "optimal",
            "interval_minutes": 15,
            "risk_profile": battery.risk_profile,
            "valuation": "p50 estimated gross value; not realized revenue or an expected-value distribution",
            "terminal_policy": "ending SOC equals initial SOC",
            "cycle_policy": "cell-side throughput / (2 * nameplate MWh); daily budget prorated to horizon",
            "optimality_tolerance_dollars": 0.0001,
        },
    )


def explain_alternatives(request):
    if request.interval_index >= len(request.forecast):
        raise ValueError("interval_index is outside the forecast horizon")
    battery = resolve_battery(request)
    result = run_dispatch(request)
    power = min(1.0, battery.power_mw * 0.01)
    alternatives = []
    for action in ["CHARGE", "DISCHARGE"]:
        try:
            _, summary = optimize(
                battery, request.forecast, (request.interval_index, action, power)
            )
            loss = (
                result.summary.policy_objective_value - summary.policy_objective_value
            )
            alternatives.append(
                {
                    "action": action,
                    "minimum_power_mw": power,
                    "feasible": True,
                    "policy_value_loss": max(0, loss),
                    "estimated_gross_value": summary.estimated_gross_value,
                    "description": "Entire horizon re-optimized with this minimum action; difference uses policy prices, not realized value.",
                }
            )
        except OptimizationError:
            alternatives.append(
                {
                    "action": action,
                    "minimum_power_mw": power,
                    "feasible": False,
                    "description": "No proven optimal alternative under unchanged constraints (infeasible or solver timeout).",
                }
            )
    return {
        "explanation": result.explanations[request.interval_index],
        "alternatives": alternatives,
    }
