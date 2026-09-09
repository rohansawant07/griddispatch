import type { Comparison } from "@/lib/types";
import { money, time } from "@/lib/api";
export default function ShadowComparison({
  comparison,
  onDemo,
  onUpload,
  busy,
  error,
  label,
}: {
  comparison: Comparison | null;
  onDemo: () => void;
  onUpload: (file: File) => void;
  busy: boolean;
  error: string | null;
  label: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">SHADOW MODE</span>
          <h2>Compare with the operator plan</h2>
        </div>
        <span className="tag">Analysis only</span>
      </div>
      <p className="muted">
        Both schedules must satisfy the same asset limits and restore starting
        SOC. Invalid plans are rejected.
      </p>
      <div className="button-row">
        <button className="secondary" disabled={busy} onClick={onDemo}>
          {busy ? "Evaluating…" : "Use demo baseline"}
        </button>
        <label className={`upload-button ${busy ? "disabled" : ""}`}>
          Upload schedule
          <input
            aria-label="Upload operator schedule"
            type="file"
            accept=".csv,.json"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        <span className="help">CSV / JSON · timestamp, action, power_mw</span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {comparison && (
        <>
          <p className="help">{label}</p>
          <div className="shadow-values">
            <div>
              <span>Baseline estimate</span>
              <strong>
                {money(comparison.baseline.summary.estimated_gross_value)}
              </strong>
            </div>
            <div>
              <span>Recommended estimate</span>
              <strong>
                {money(comparison.recommended.summary.estimated_gross_value)}
              </strong>
            </div>
            <div>
              <span>Estimated difference</span>
              <strong
                className={
                  comparison.estimated_difference >= 0 ? "positive" : ""
                }
              >
                {comparison.estimated_difference >= 0 ? "+" : ""}
                {money(comparison.estimated_difference)}
              </strong>
            </div>
          </div>
          <details>
            <summary>
              {comparison.differing_intervals.length} intervals differ · inspect
              times
            </summary>
            <p className="diff-times">
              {comparison.differing_intervals
                .map((i) => time(comparison.recommended.schedule[i].timestamp))
                .join(" · ") || "Schedules match."}
            </p>
          </details>
          <p className="help">
            Baseline SOC is overlaid on the stored-energy chart. Estimates
            exclude fees and degradation; they are not realized revenue.
          </p>
        </>
      )}
    </section>
  );
}
