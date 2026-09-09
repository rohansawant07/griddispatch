"use client";
import { useEffect, useState, useRef } from "react";
import { useDispatchTool } from "@/lib/useDispatchTool";
import BatteryConfig from "@/components/BatteryConfig";
import ForecastChart from "@/components/ForecastChart";
import SocChart from "@/components/SocChart";
import SummaryCards from "@/components/SummaryCards";
import DecisionTimeline from "@/components/DecisionTimeline";
import ExplanationPanel from "@/components/ExplanationPanel";
import ScenarioComparison from "@/components/ScenarioComparison";
import ShadowComparison from "@/components/ShadowComparison";
import { api, uploadForecast, readBaseline } from "@/lib/api";
import type {
  Battery,
  Forecast,
  Result,
  Summary,
  Risk,
  Input,
  Comparison,
  Baseline,
  Alternative,
} from "@/lib/types";
export default function Page() {
  const [battery, setBattery] = useState<Battery | null>(null),
    [forecast, setForecast] = useState<Forecast[]>([]),
    [source, setSource] = useState("Synthetic demo data");
  const [result, setResult] = useState<Result | null>(null),
    [snapshot, setSnapshot] = useState<Input | null>(null),
    [resultSource, setResultSource] = useState("");
  const [scenarios, setScenarios] = useState<Record<Risk, Summary> | null>(
      null,
    ),
    [busy, setBusy] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0),
    [comparison, setComparison] = useState<Comparison | null>(null),
    [shadowBusy, setShadowBusy] = useState(false),
    [shadowError, setShadowError] = useState<string | null>(null),
    [baselineLabel, setBaselineLabel] = useState("");
  const [alternatives, setAlternatives] = useState<Alternative[] | null>(null),
    [altBusy, setAltBusy] = useState(false);
  useDispatchTool(result);
  const generation = useRef(0),
    selection = useRef(0);
  async function run(b: Battery, f: Forecast[], label: string) {
    const version = ++generation.current;
    setBusy(true);
    setError(null);
    setComparison(null);
    setAlternatives(null);
    setShadowError(null);
    try {
      const input = { battery: b, forecast: f };
      const [r, s] = await Promise.all([
        api<Result>("optimize", input),
        api<Record<Risk, Summary>>("scenarios", input),
      ]);
      if (version !== generation.current) return;
      setResult(r);
      setScenarios(s);
      setSnapshot(input);
      setResultSource(label);
      setSelected(0);
      selection.current = 0;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let mounted = true;
    Promise.all([
      api<Battery>("demo/battery"),
      api<{ forecast: Forecast[] }>("demo/forecast"),
    ])
      .then(([b, f]) => {
        if (mounted) {
          setBattery(b);
          setForecast(f.forecast);
          void run(b, f.forecast, "Synthetic demo data");
        }
      })
      .catch((e) => {
        setError(e.message);
        setBusy(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const dirty =
    !!snapshot &&
    JSON.stringify(snapshot) !== JSON.stringify({ battery, forecast });
  async function importFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const data = await uploadForecast(file);
      setForecast(data.forecast);
      setSource(`Uploaded forecast: ${file.name}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function shadow(baseline: Baseline[], label: string) {
    if (!snapshot) return;
    setShadowBusy(true);
    setShadowError(null);
    setComparison(null);
    const version = generation.current;
    try {
      const data = await api<Comparison>("compare", { ...snapshot, baseline });
      if (version === generation.current) {
        setComparison(data);
        setBaselineLabel(label);
      }
    } catch (e) {
      if (version === generation.current) setShadowError((e as Error).message);
    } finally {
      setShadowBusy(false);
    }
  }
  async function demoShadow() {
    setShadowBusy(true);
    try {
      await shadow(
        await api<Baseline[]>("demo/baseline"),
        "Included synthetic operator schedule",
      );
    } catch (e) {
      setShadowError((e as Error).message);
    } finally {
      setShadowBusy(false);
    }
  }
  async function uploadShadow(file: File) {
    try {
      await shadow(await readBaseline(file), `Uploaded schedule: ${file.name}`);
    } catch (e) {
      setShadowError((e as Error).message);
    }
  }
  async function testAlternatives() {
    if (!snapshot) return;
    setAltBusy(true);
    setError(null);
    const version = generation.current,
      index = selected;
    try {
      const data = await api<{ alternatives: Alternative[] }>("explain", {
        ...snapshot,
        interval_index: index,
      });
      if (version === generation.current && selection.current === index)
        setAlternatives(data.alternatives);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAltBusy(false);
    }
  }
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ▥
          </span>
          <div>
            <h1>
              GridDispatch<span className="prototype">PROTOTYPE / 01</span>
            </h1>
            <p>
              Operator specific battery dispatch from probabilistic forecasts
            </p>
          </div>
        </div>
        <span className="demo-badge">
          <i />
          {resultSource.startsWith("Uploaded")
            ? "Operator Uploaded Data"
            : "Synthetic Demo Data"}
        </span>
      </header>
      <div className="workspace">
        {" "}
        <aside>
          {battery ? (
            <BatteryConfig
              battery={battery}
              onChange={setBattery}
              onRun={() => void run(battery, forecast, source)}
              busy={busy || shadowBusy || altBusy}
              dirty={dirty}
            />
          ) : (
            <div className="config">
              <h2>Loading asset configuration…</h2>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
        </aside>
        <main>
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">DISPATCH WORKSPACE</span>
              <h2>{snapshot?.battery.name || "Battery operations"}</h2>
            </div>
            <div className="run-status">
              <i className={result ? "ready" : ""} />
              {busy
                ? "Computing schedule…"
                : result
                  ? "Optimal schedule"
                  : "Awaiting backend"}
            </div>
          </div>
          <div className="forecast-toolbar">
            <span>
              {forecast.length} intervals ·{" "}
              {forecast[0]?.timestamp.slice(0, 10) || "—"} · {source}
            </span>
            <div className="button-row">
              <label className="upload-button">
                Import forecast
                <input
                  type="file"
                  aria-label="Import forecast"
                  accept=".csv,.json"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const d = await api<{ forecast: Forecast[] }>(
                      "demo/forecast",
                    );
                    setForecast(d.forecast);
                    setSource("Synthetic demo data");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Reset forecast
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {dirty && (
            <div className="notice">
              Inputs changed. Results below show the last completed run:{" "}
              {resultSource}. Run Dispatch to apply changes.
            </div>
          )}
          {result && snapshot && scenarios ? (
            <>
              <SummaryCards summary={result.summary} />
              <ForecastChart forecast={snapshot.forecast} result={result} />
              <SocChart
                battery={snapshot.battery}
                schedule={result.schedule}
                baseline={comparison?.baseline.schedule}
              />
              <div className="decision-grid">
                <DecisionTimeline
                  schedule={result.schedule}
                  selected={selected}
                  onSelect={(i) => {
                    setSelected(i);
                    selection.current = i;
                    setAlternatives(null);
                  }}
                />
                <ExplanationPanel
                  explanation={result.explanations[selected]}
                  alternatives={alternatives}
                  onTest={() => void testAlternatives()}
                  busy={altBusy || busy}
                />
              </div>
              <ScenarioComparison
                scenarios={scenarios}
                selected={snapshot.battery.risk_profile}
              />
              <ShadowComparison
                comparison={comparison}
                onDemo={() => void demoShadow()}
                onUpload={(f) => void uploadShadow(f)}
                busy={shadowBusy || busy}
                error={shadowError}
                label={baselineLabel}
              />
              <footer>
                <span>
                  MODEL {result.audit.model_version} ·{" "}
                  <span title={result.audit.input_sha256}>
                    INPUT {result.audit.input_sha256.slice(0, 12)}
                  </span>{" "}
                  · {snapshot.battery.settlement_node}
                </span>
                <p>
                  Independent engineering prototype. Not affiliated with or
                  endorsed by Parisi Labs. Forecast fixture is synthetic.
                  Estimates are not realized revenue.
                </p>
              </footer>
            </>
          ) : (
            <div className="empty-state">
              <h2>
                {error
                  ? "Connect the decision service"
                  : "Preparing the demo dispatch"}
              </h2>
              <p>
                {error
                  ? "Start the backend on port 8000, then reload this page."
                  : "Loading the synthetic forecast and solving the constrained battery schedule."}
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
