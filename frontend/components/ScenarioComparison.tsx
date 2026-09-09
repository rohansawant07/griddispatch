import type { Summary, Risk } from "@/lib/types";
import { money, num } from "@/lib/api";
export default function ScenarioComparison({
  scenarios,
  selected,
}: {
  scenarios: Record<Risk, Summary>;
  selected: Risk;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">POLICY SENSITIVITY</span>
          <h2>Same asset. Three risk profiles.</h2>
        </div>
      </div>
      <div className="scenario-grid">
        {(Object.entries(scenarios) as [Risk, Summary][]).map(([risk, s]) => (
          <div
            className={`scenario ${risk === selected ? "active" : ""}`}
            key={risk}
          >
            <div className="scenario-title">
              <h3>{risk}</h3>
              {risk === selected && <span className="eyebrow">SELECTED</span>}
            </div>
            <strong>{money(s.estimated_gross_value)}</strong>
            <span className="help">Estimated gross value at p50</span>
            <dl>
              <div>
                <dt>Ending SOC</dt>
                <dd>{num(s.ending_soc * 100)}%</dd>
              </div>
              <div>
                <dt>Charged / discharged</dt>
                <dd>
                  {num(s.energy_charged_mwh)} / {num(s.energy_discharged_mwh)}{" "}
                  MWh
                </dd>
              </div>
              <div>
                <dt>Equivalent cycles</dt>
                <dd>{num(s.equivalent_cycles, 2)}</dd>
              </div>
              <div>
                <dt>Dispatch intervals</dt>
                <dd>{s.dispatch_intervals}</dd>
              </div>
              <div>
                <dt>Policy objective</dt>
                <dd>{money(s.policy_objective_value)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <p className="help">
        Policy objectives use different prices and are not directly comparable.
        The gross-value estimates above all use p50, a median-price proxy.
      </p>
    </section>
  );
}
