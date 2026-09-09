from app.models.dispatch import Explanation
from app.services.accounting import TOL


def explain_schedule(battery, forecast, rows, summary):
    explanations = []
    for i, (point, row) in enumerate(zip(forecast, rows)):
        constraints = []
        if min(row.soc_before, row.soc_after) <= battery.min_soc + TOL:
            constraints.append("SOC reserve floor (interval boundary)")
        if max(row.soc_before, row.soc_after) >= battery.max_soc - TOL:
            constraints.append("Maximum SOC (interval boundary)")
        if row.power_mw >= battery.power_mw - TOL:
            constraints.append("Power rating")
        if summary.equivalent_cycles >= summary.cycle_budget - TOL:
            constraints.append("Cycle budget (whole horizon)")
        if i == len(rows) - 1:
            constraints.append("Terminal SOC equals initial SOC")
        drivers = [
            f"{battery.risk_profile.title()} policy: buy ${row.effective_buy_price:.2f}/MWh, sell ${row.effective_sell_price:.2f}/MWh",
            "Horizon-wide optimization with efficiency losses and restored ending SOC",
        ]
        if row.action == "CHARGE":
            reason = "The optimized horizon allocates charging here to supply discharge opportunities while accounting for charging losses and the terminal SOC target."
            change = "Higher effective buying prices or less available storage could reduce charging; re-optimization is required."
        elif row.action == "DISCHARGE":
            reason = "The optimized horizon allocates stored energy to this sale opportunity within power, SOC and throughput limits."
            change = "Lower effective selling prices, a higher reserve floor, or stronger competing opportunities could reduce discharge."
        else:
            reason = "No charging or discharging is selected in the optimal horizon allocation; local price alone does not establish a profitable feasible trade."
            if battery.max_cycles_per_day == 0:
                reason = "The configured cycle budget is zero, so energy throughput is prohibited."
            elif row.soc_before <= battery.min_soc + TOL:
                reason = "Discharging is physically unavailable at the reserve floor. Charging is not selected by the horizon optimization."
            elif row.soc_before >= battery.max_soc - TOL:
                reason = "Charging is physically unavailable at maximum SOC. Discharging is not selected by the horizon optimization."
            future = [r for r in rows[i + 1 :] if r.action == "DISCHARGE"]
            if (
                future
                and max(r.effective_sell_price for r in future)
                > row.effective_sell_price
            ):
                drivers.append(
                    "A later selected discharge interval has a higher effective selling price"
                )
            if battery.risk_profile == "conservative" and point.p90 > point.p10:
                drivers.append(
                    "Adverse quantile prices narrow the evaluated spread; uncertainty alone is not proven to cause this HOLD"
                )
            change = "Use 'Test alternatives' to force a small charge or discharge and re-optimize the whole horizon. No unverified price or SOC threshold is asserted."
        explanations.append(
            Explanation(
                timestamp=point.timestamp,
                action=row.action,
                power_mw=row.power_mw,
                soc_before=row.soc_before,
                soc_after=row.soc_after,
                forecast=point,
                reason=reason,
                binding_constraints=constraints,
                decision_drivers=drivers,
                what_could_change=change,
            )
        )
    return explanations
