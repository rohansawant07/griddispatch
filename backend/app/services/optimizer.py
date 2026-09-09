import pulp
from app.models.forecast import validate_horizon
from app.services.accounting import DT, cycle_budget, evaluate_schedule
from app.services.risk import effective_prices


class OptimizationError(RuntimeError):
    pass


def optimize(battery, forecast, forced=None):
    """MILP with charge/discharge exclusivity and an exact terminal SOC target.

    `forced=(index, action, MW)` supports conditional re-optimization for explanations.
    A second solve minimizes throughput within $0.0001 of the primary optimum.
    CBC is single-threaded with a fixed seed and must prove optimality.
    """
    validate_horizon(forecast)
    n = len(forecast)
    problem = pulp.LpProblem("GridDispatch", pulp.LpMaximize)
    charge = pulp.LpVariable.dicts(
        "charge", range(n), lowBound=0, upBound=battery.power_mw
    )
    discharge = pulp.LpVariable.dicts(
        "discharge", range(n), lowBound=0, upBound=battery.power_mw
    )
    mode = pulp.LpVariable.dicts("charging", range(n), cat="Binary")
    energy = pulp.LpVariable.dicts(
        "energy",
        range(n + 1),
        lowBound=battery.min_soc * battery.energy_mwh,
        upBound=battery.max_soc * battery.energy_mwh,
    )
    problem += energy[0] == battery.initial_soc * battery.energy_mwh
    problem += energy[n] == energy[0]
    for i in range(n):
        problem += charge[i] <= battery.power_mw * mode[i]
        problem += discharge[i] <= battery.power_mw * (1 - mode[i])
        problem += energy[i + 1] == energy[i] + DT * (
            charge[i] * battery.charge_efficiency
            - discharge[i] / battery.discharge_efficiency
        )
    throughput = pulp.lpSum(
        DT
        * (
            charge[i] * battery.charge_efficiency
            + discharge[i] / battery.discharge_efficiency
        )
        for i in range(n)
    )
    problem += throughput <= 2 * battery.energy_mwh * cycle_budget(battery, n)
    prices = [effective_prices(battery, p) for p in forecast]
    margin = pulp.lpSum(
        DT * (discharge[i] * prices[i].sell - charge[i] * prices[i].buy)
        for i in range(n)
    )
    problem += margin
    if forced:
        index, action, power = forced
        problem += (charge if action == "CHARGE" else discharge)[index] >= power
    solver = pulp.PULP_CBC_CMD(
        msg=False, threads=1, timeLimit=30, gapRel=0, options=["randomSeed 42"]
    )
    if (
        problem.solve(solver) != pulp.LpStatusOptimal
        or problem.sol_status != pulp.LpSolutionOptimal
    ):
        raise OptimizationError(
            "No proven optimal schedule (infeasible or solver time limit)"
        )
    optimum = pulp.value(margin) or 0.0
    problem += margin >= optimum - 0.0001
    problem.sense = pulp.LpMinimize
    problem.setObjective(throughput)
    if (
        problem.solve(solver) != pulp.LpStatusOptimal
        or problem.sol_status != pulp.LpSolutionOptimal
    ):
        raise OptimizationError("Secondary optimization did not prove optimality")
    powers = [
        (max(0.0, charge[i].value()), max(0.0, discharge[i].value())) for i in range(n)
    ]
    return evaluate_schedule(battery, forecast, powers)
