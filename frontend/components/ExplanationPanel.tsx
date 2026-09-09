import type { Explanation, Alternative } from "@/lib/types";
import { time, num, money } from "@/lib/api";
export default function ExplanationPanel({
  explanation: e,
  alternatives,
  onTest,
  busy,
}: {
  explanation: Explanation;
  alternatives: Alternative[] | null;
  onTest: () => void;
  busy: boolean;
}) {
  return (
    <section className="panel explanation">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">DECISION EVIDENCE</span>
          <h2>
            {time(e.timestamp)} <span className="muted">UTC</span>
          </h2>
        </div>
        <span className={`action ${e.action.toLowerCase()}`}>{e.action}</span>
      </div>
      <div className="decision-power">
        <strong>
          {num(e.power_mw)} <small>MW</small>
        </strong>
        <span>
          {num(e.soc_before * 100)}% → {num(e.soc_after * 100)}% SOC
        </span>
      </div>
      <div className="quantiles">
        {(["p10", "p50", "p90"] as const).map((k) => (
          <div key={k}>
            <span>{k}</span>
            <strong>${num(e.forecast[k])}</strong>
          </div>
        ))}
      </div>
      <p className="help">Forecast prices in $/MWh</p>
      <h3>Why this action</h3>
      <p>{e.reason}</p>
      <h3>Active constraints</h3>
      <p className="help">
        Tight boundaries are reported as evidence, not proof of causality.
      </p>
      {e.binding_constraints.length ? (
        <ul>
          {e.binding_constraints.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">No local physical limit is tight.</p>
      )}
      <h3>Decision drivers</h3>
      <ul>
        {e.decision_drivers.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <h3>What could change the decision</h3>
      <p>{e.what_could_change}</p>
      <button className="secondary" disabled={busy} onClick={onTest}>
        {busy ? "Re-optimizing alternatives…" : "Test alternatives"}
      </button>
      {alternatives && (
        <div aria-live="polite">
          {alternatives.map((a) => (
            <div className="alternative" key={a.action}>
              <strong>
                {a.action} ≥ {num(a.minimum_power_mw, 2)} MW
              </strong>
              <p>
                {a.feasible
                  ? `Feasible · ${money(a.policy_value_loss || 0)} policy value loss`
                  : "No proven feasible optimum"}
              </p>
              <small>{a.description}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
