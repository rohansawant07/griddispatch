import type { Battery, Risk } from "@/lib/types";
type Props = {
  battery: Battery;
  onChange: (value: Battery) => void;
  onRun: () => void;
  busy: boolean;
  dirty: boolean;
};
export default function BatteryConfig({
  battery,
  onChange,
  onRun,
  busy,
  dirty,
}: Props) {
  const field = (
    key: keyof Battery,
    label: string,
    unit: string,
    min: number,
    max: number,
    step: number,
  ) => (
    <label className="field" key={key}>
      <span>{label}</span>
      <div className="input-unit">
        <input
          aria-label={label}
          type="number"
          required
          min={min}
          max={max}
          step={step}
          value={battery[key]}
          onChange={(e) =>
            onChange({ ...battery, [key]: Number(e.target.value) })
          }
        />
        <span>{unit}</span>
      </div>
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRun();
      }}
      className="config"
    >
      <div className="section-head">
        <h2>Asset configuration</h2>
        <span className="section-num">01</span>
      </div>
      <label className="field">
        <span>Asset name</span>
        <input
          value={battery.name}
          maxLength={100}
          required
          onChange={(e) => onChange({ ...battery, name: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Settlement node</span>
        <input
          value={battery.settlement_node}
          maxLength={100}
          required
          onChange={(e) =>
            onChange({ ...battery, settlement_node: e.target.value })
          }
        />
      </label>
      <div className="field-grid">
        {field("power_mw", "Power rating", "MW", 0.01, 10000, 0.01)}
        {field("energy_mwh", "Energy capacity", "MWh", 0.01, 100000, 0.01)}
      </div>
      {field("initial_soc", "Current SOC", "fraction", 0, 1, 0.01)}
      <div className="field-grid">
        {field("min_soc", "Minimum SOC", "", 0, 0.99, 0.01)}
        {field("max_soc", "Maximum SOC", "", 0.01, 1, 0.01)}
      </div>
      <p className="help">SOC and efficiency use fractions: 0.54 = 54%.</p>
      <div className="divider" />
      <div className="field-grid">
        {field("charge_efficiency", "Charge efficiency", "", 0.01, 1, 0.01)}
        {field(
          "discharge_efficiency",
          "Discharge efficiency",
          "",
          0.01,
          1,
          0.01,
        )}
      </div>
      {field("max_cycles_per_day", "Cycle limit", "/ day", 0, 20, 0.1)}
      <label className="field">
        <span>Risk policy</span>
        <select
          value={battery.risk_profile}
          onChange={(e) =>
            onChange({ ...battery, risk_profile: e.target.value as Risk })
          }
        >
          <option value="conservative">Conservative</option>
          <option value="neutral">Neutral</option>
          <option value="aggressive">Aggressive</option>
        </select>
      </label>
      {battery.risk_profile === "aggressive" &&
        field("aggressive_weight", "Upside weight", "", 0, 1, 0.05)}
      <div className="policy-note">
        {battery.risk_profile === "neutral"
          ? "Buy and sell at p50. Median forecast economics."
          : battery.risk_profile === "conservative"
            ? "Buy: 75% p90 + 25% p50. Sell: 75% p10 + 25% p50."
            : `Buy: ${(100 * (1 - battery.aggressive_weight)).toFixed(0)}% p50 + ${(100 * battery.aggressive_weight).toFixed(0)}% p10. Sell uses p90 for the upside weight.`}
      </div>
      <button className="primary" disabled={busy} type="submit">
        {busy ? "Optimizing…" : "Run Dispatch"}
        <span aria-hidden>↗</span>
      </button>
      <p className="help status-line">
        {dirty
          ? "Configuration changed · rerun to apply"
          : "Deterministic optimization · no LLM"}
      </p>
      <div className="assumptions">
        <span className="eyebrow">OPERATING POLICY</span>
        <p>Ending SOC restores starting SOC.</p>
        <p>Cycle allowance is prorated to the forecast horizon.</p>
        <p>Recommendations only. No asset connection.</p>
      </div>
    </form>
  );
}
