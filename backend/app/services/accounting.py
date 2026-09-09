from app.models.dispatch import DispatchInterval, Summary
from app.services.risk import effective_prices

DT = 0.25
TOL = 1e-5


def cycle_budget(battery, count):
    # A rolling horizon budget, prorated from the daily allowance (not calendar resets).
    return battery.max_cycles_per_day * count * DT / 24


def evaluate_schedule(battery, forecast, powers):
    """Single physical/accounting path for solver results AND operator baselines.

    Powers are grid-side MW. Cycles use cell-side absolute throughput / (2 * nameplate MWh).
    Invalid schedules are rejected, never silently clipped or repaired.
    """
    if len(powers) != len(forecast):
        raise ValueError("schedule must have one entry for every forecast interval")
    energy = battery.initial_soc * battery.energy_mwh
    total_throughput = 0.0
    rows = []
    for i, (point, (charge, discharge)) in enumerate(zip(forecast, powers)):
        if (
            min(charge, discharge) < -TOL
            or max(charge, discharge) > battery.power_mw + TOL
        ):
            raise ValueError(f"interval {i}: power rating violated")
        if charge > TOL and discharge > TOL:
            raise ValueError(f"interval {i}: simultaneous charging and discharging")
        before = energy / battery.energy_mwh
        ec, ed = charge * DT, discharge * DT
        energy += ec * battery.charge_efficiency - ed / battery.discharge_efficiency
        after = energy / battery.energy_mwh
        if after < battery.min_soc - TOL or after > battery.max_soc + TOL:
            raise ValueError(f"interval {i}: SOC bounds violated ({after:.6f})")
        total_throughput += (
            ec * battery.charge_efficiency + ed / battery.discharge_efficiency
        )
        price = effective_prices(battery, point)
        action = (
            "CHARGE" if charge > TOL else "DISCHARGE" if discharge > TOL else "HOLD"
        )
        rows.append(
            DispatchInterval(
                timestamp=point.timestamp,
                action=action,
                power_mw=max(charge, discharge),
                charge_mw=charge,
                discharge_mw=discharge,
                energy_charged_mwh=ec,
                energy_discharged_mwh=ed,
                soc_before=before,
                soc_after=after,
                expected_price=point.p50,
                effective_buy_price=price.buy,
                effective_sell_price=price.sell,
                estimated_gross_value=(ed - ec) * point.p50,
            )
        )
    cycles = total_throughput / (2 * battery.energy_mwh)
    budget = cycle_budget(battery, len(forecast))
    if cycles > budget + TOL:
        raise ValueError("cycle limit violated")
    if abs(energy / battery.energy_mwh - battery.initial_soc) > TOL:
        raise ValueError(
            "terminal SOC must equal initial SOC for a like-for-like comparison"
        )
    summary = Summary(
        estimated_gross_value=sum(x.estimated_gross_value for x in rows),
        policy_objective_value=sum(
            x.energy_discharged_mwh * x.effective_sell_price
            - x.energy_charged_mwh * x.effective_buy_price
            for x in rows
        ),
        ending_soc=energy / battery.energy_mwh,
        equivalent_cycles=cycles,
        cycle_budget=budget,
        energy_charged_mwh=sum(x.energy_charged_mwh for x in rows),
        energy_discharged_mwh=sum(x.energy_discharged_mwh for x in rows),
        dispatch_intervals=sum(x.action != "HOLD" for x in rows),
    )
    return rows, summary
