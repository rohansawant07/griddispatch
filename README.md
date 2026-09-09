# GridDispatch

**Operator specific battery dispatch from probabilistic price forecasts**

GridDispatch is a compact Forward Deployed Engineering prototype exploring the last mile between a probabilistic market forecast and an operational battery decision.

```text
Forecast → Operator context → Physical constraints → Risk policy
    → Optimization → CHARGE / HOLD / DISCHARGE → Explanation
```

Forecasting and decision making are different problems. A forecast estimates possible futures. The decision layer combines that signal with physical constraints, operating policy, and risk tolerance. GridDispatch focuses on that decision layer; no LLM makes dispatch decisions.

## Why I built this

A customer rarely needs another prediction endpoint. They need to know what to do with a forecast, which constraints matter, why the system chose not to act, and whether the recommendation improves on the existing plan.

Battery storage makes this distinction concrete. A high forecast price alone is insufficient: SOC, reserve requirements, efficiency, remaining cycle budget, later opportunities, and risk tolerance all affect a feasible decision. This prototype translates those operational questions into a working workflow an FDE could bring into the first days of a customer engagement.

## Quick start

Requires Python **3.12** and Node.js **22** with npm, or Docker Compose. No external credentials or services are required.

```bash
# Terminal 1, from the repository root
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
# Terminal 2, from the repository root
cd frontend
npm ci
npm run dev
```

Open **http://localhost:3000**. API docs are at **http://localhost:8000/docs**. The dashboard loads the fixture and runs all three policies automatically. If the backend starts later, reload the page. On systems with low file watcher limits, use `WATCHPACK_POLLING=true npm run dev`.

The browser uses a same-origin Next.js proxy. `BACKEND_URL` is a server-side environment variable and defaults to `http://127.0.0.1:8000`; see `frontend/.env.example`.

### Docker

```bash
docker compose up --build
# Open http://localhost:3000
# Stop with Ctrl+C, then:
docker compose down
```

The backend health check gates frontend startup. Both published ports bind to loopback. The frontend container uses `BACKEND_URL=http://backend:8000`. PuLP includes CBC binaries for common supported platforms. Solver availability is exercised by the tests and CI.

## Product walkthrough

1. Adjust the asset, SOC bounds, efficiencies, daily cycle allowance and risk profile.
2. Use the synthetic forecast, or import a CSV/JSON forecast.
3. Click **Run Dispatch**. Pending input edits are marked; charts keep the last completed run until a new solve succeeds.
4. Inspect the p10–p90 uncertainty band, p50 price, grid-side charge/discharge power and SOC boundaries.
5. Select an interval in the decision timeline. Read its deterministic evidence and active constraints.
6. **Test alternatives** forces a small minimum charge/discharge, then re-optimizes the horizon to measure policy-value loss or report failure to find a proven optimum.
7. Compare conservative, neutral and aggressive schedules under common p50 valuation.
8. In shadow mode, select the demo operator plan or upload a schedule. Compare estimated value, differing intervals and the overlaid SOC trajectory.

Every recommendation is analysis only. The app does not connect to an asset or submit market instructions.

## Battery model

Pydantic rejects unknown fields, nonfinite numbers, nonpositive capacities, invalid efficiencies and inconsistent SOC bounds.

```json
{
  "name": "ERCOT Battery 01",
  "power_mw": 100,
  "energy_mwh": 200,
  "initial_soc": 0.54,
  "min_soc": 0.10,
  "max_soc": 0.95,
  "charge_efficiency": 0.94,
  "discharge_efficiency": 0.94,
  "max_cycles_per_day": 1.5,
  "settlement_node": "DEMO_NODE",
  "risk_profile": "neutral",
  "aggressive_weight": 0.35
}
```

Power is grid-side MW. Energy capacity is nameplate MWh. SOC and efficiency are fractions (`0.54 = 54%`). Node and name are operator context recorded in the input hash; this prototype does not verify a forecast's node against an external registry.

## Forecast model and demo data

CSV columns, or keys in a JSON array of records:

```csv
timestamp,p10,p50,p90
2026-09-09T00:00:00Z,17,24,33.45
2026-09-09T00:15:00Z,17.6,24.6,34.05
```

This example illustrates the schema; the full fixture is in `backend/app/data/synthetic_forecast.csv`. The included day has 96 quarter-hour intervals: overnight low prices, a morning increase, midday normalization, and an evening scarcity-shaped event with widening uncertainty.

Input timestamps must be timezone-aware; they are normalized to UTC. Inputs must contain **2–96 ordered, unique, consecutive 15-minute intervals**, with `p10 ≤ p50 ≤ p90`. Gaps, duplicates and naive timestamps fail validation. The last timestamp marks the start of the final 15-minute interval. Prices may be negative. Uploads are limited to 1 MB.

**All included market and baseline data is synthetic.** It is not historical market data, not produced by Parisi Labs, and cannot establish actual trading performance. Uploaded data is labeled separately; provenance is not verified. The three quantiles are not enough to recover a full price distribution or compute a statistical expected value.

## Why deterministic optimization

Operational constraints should not be suggestions. The battery cannot exceed capacity, discharge unavailable energy, ignore reserve requirements, violate power ratings, or exceed its cycle policy because a forecast looks attractive.

The prediction layer answers “what might happen?” The decision layer answers “what should this asset do within its allowed operating envelope?” Keeping them separate makes the system testable, auditable and easier to integrate safely.

## Architecture and technology

```text
Next.js / TypeScript / Tailwind / Recharts
                │ same-origin HTTP proxy
FastAPI / Pydantic
                │
Application service
  ├── Forecast providers (pandas CSV / JSON / synthetic)
  ├── Risk policy (explicit effective buy/sell prices)
  ├── PuLP / CBC optimizer
  ├── Shared physical accounting and baseline validation
  ├── Deterministic explanation engine
  └── Shadow comparison / scenario analysis
                │
Typed domain models
```

API handlers delegate business logic. Forecast ingestion contains no dispatch rules. The frontend never computes dispatch decisions. The explanation engine reads optimizer outputs and never modifies them. The shared accounting service independently checks both solved schedules and operator plans.

```text
griddispatch/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes.py
│   │   ├── models/{battery,forecast,dispatch}.py
│   │   ├── providers/{base,synthetic,csv_provider,parisi}.py
│   │   ├── services/{application,risk,optimizer,accounting,explanations,comparison}.py
│   │   └── data/{synthetic_forecast,baseline_schedule}.csv
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/ (dashboard, layout, stylesheet, API proxy)
│   ├── components/ (configuration, charts, evidence, comparisons)
│   ├── lib/{api,types}.ts
│   └── Dockerfile
├── docs/architecture.md
├── .github/workflows/ci.yml
├── docker-compose.yml
├── README.md
└── LICENSE
```

## Risk policies

Implemented transparently in `backend/app/services/risk.py`:

| Profile | Effective buy price | Effective sell price |
| --- | --- | --- |
| Conservative | 0.75 × p90 + 0.25 × p50 | 0.75 × p10 + 0.25 × p50 |
| Neutral | p50 | p50 |
| Aggressive | (1 − w) × p50 + w × p10 | (1 − w) × p50 + w × p90 |

`w = aggressive_weight`, configurable from 0 to 1, default 0.35. Conservative pricing evaluates adverse purchase/sale assumptions. Aggressive pricing tolerates uncertainty in pursuit of upside. These are quantile-based heuristics, **not stochastic optimization, CVaR, calibrated probabilities, or a proven lower bound on revenue**. Applying favorable quantiles to different trades may describe mutually inconsistent futures.

Every scenario's displayed **estimated gross value** uses p50 for both purchases and sales. This common median-price proxy supports comparison. The separate **policy objective value** uses that scenario's effective prices and should not be compared directly across policies. Aggressive does not necessarily deliver higher p50 value; neutral optimizes that valuation directly.

## Optimization and accounting

For interval `t`, PuLP chooses nonnegative charge `c[t]` and discharge `d[t]` in grid-side MW, battery energy `E[t]` in MWh, and a binary charge mode. `Δt = 0.25 hours`.

```text
maximize Σ Δt × (d[t] × effective_sell[t] − c[t] × effective_buy[t])

E[t+1] = E[t] + Δt × (η_charge × c[t] − d[t] / η_discharge)

min_soc × capacity ≤ E[t] ≤ max_soc × capacity
0 ≤ c[t] ≤ power_mw × mode[t]
0 ≤ d[t] ≤ power_mw × (1 − mode[t])
mode[t] ∈ {0, 1}
E[0] = initial_soc × capacity
E[n] = E[0]
```

### Terminal SOC

Ending SOC **must equal initial SOC**. This avoids artificial gross margin from liquidating the starting inventory and makes shadow comparisons like-for-like. It is a deliberate operating policy, not a universal battery requirement. A production model might use a terminal energy value or an operator target instead.

### Cycling

```text
cell_throughput = Σ Δt × (η_charge × c[t] + d[t] / η_discharge)
equivalent_cycles = cell_throughput / (2 × nameplate_energy_mwh)
horizon_cycle_budget = max_cycles_per_day × horizon_hours / 24
equivalent_cycles ≤ horizon_cycle_budget
```

This is a prorated rolling-horizon budget, not a calendar-day reset and not a degradation model. A short horizon receives a proportional allowance. Energy charged/discharged reported in the UI remains grid-side MWh; equivalent cycles use battery-side energy.

### Solver behavior

CBC uses one thread, a fixed seed, zero relative gap and a 30-second limit per solve. Only a proven optimum is accepted. A second solve minimizes throughput while keeping the policy objective within $0.0001 of the first optimum, preventing unnecessary zero-value cycling. Identical inputs are repeatable in the tested pinned environment; cross-version/architecture tie choices are not promised. Physical checks allow small numerical tolerances (SOC/power/cycles `1e-5`).

## Explanations and “why not dispatch?”

Every interval contains action, power, SOC before/after, quantiles, effective prices, reason, decision drivers and active constraints. Tight interval boundaries are named explicitly; the cycle budget is labeled as a whole-horizon constraint. A tight constraint is evidence, not proof that it caused the action.

HOLD may be associated with the reserve floor, maximum SOC, zero cycle budget, insufficient risk-adjusted economics, efficiency losses, the terminal target, or competing opportunities. The engine avoids invented discharge thresholds and does not claim uncertainty caused a HOLD without a sensitivity test.

`POST /explain` re-solves the entire model twice, forcing charge and discharge of at least `min(1 MW, 1% of rated power)` at the selected interval. It reports feasibility and the loss in policy objective versus the original schedule. This is a measured conditional alternative, **not an exact price/SOC switching threshold**. Infeasibility and inability to prove optimality before the solver deadline are conservatively reported together. A zero-loss alternative indicates an equivalent or numerically near-equivalent optimum.

The standard explanations remain qualitative where causality or a threshold cannot be established safely. No generative model is involved.

## Shadow mode

Included baseline: 30 MW charge from 01:00–03:00 UTC, then 26.508 MW discharge from 17:00–19:00 UTC, otherwise HOLD. This balances battery energy at the default 94% charge/discharge efficiencies. Its modest throughput makes a meaningful, feasible default comparison.

```csv
timestamp,action,power_mw
2026-09-09T00:00:00Z,HOLD,0
2026-09-09T00:15:00Z,HOLD,0
```

Upload a full CSV with the exact header order above or a JSON array. Timestamps must match the forecast exactly, actions must be valid, HOLD power must be zero, and the full schedule must pass the **same** power, SOC, efficiency, cycle and terminal checks. Invalid plans are rejected, never clipped or silently repaired. Changing asset efficiency or bounds can make the included baseline invalid; the UI reports the violated constraint.

Both plans are valued at p50. The app displays baseline estimate, recommended estimate, estimated difference, SOC comparison and differing interval indices/times. These are gross estimates excluding degradation, fees and settlement effects, not realized revenue.

A practical adoption path would be historical backtest → shadow recommendations → operator review → limited assisted operation. This prototype stops at recommendations and comparison.

## API

Interactive schemas and executable requests: `http://localhost:8000/docs`.

| Route | Purpose |
| --- | --- |
| `GET /health` | Health and model version |
| `GET /demo/battery` | Default validated asset |
| `GET /demo/forecast` | `{source, forecast}` synthetic fixture |
| `GET /demo/baseline` | Included operator schedule |
| `POST /forecast/import` | Multipart `file`, CSV or JSON |
| `POST /optimize` | Battery + forecast → summary, schedule, explanations, audit |
| `POST /scenarios` | Same asset under all three risk profiles |
| `POST /compare` | Optimize request plus full `baseline` array |
| `POST /explain` | Optimize request plus `interval_index` |

`POST /optimize` body:

```json
{
  "battery": {"name": "ERCOT Battery 01", "risk_profile": "neutral"},
  "forecast": [
    {"timestamp": "2026-09-09T00:00:00Z", "p10": 10, "p50": 15, "p90": 20},
    {"timestamp": "2026-09-09T00:15:00Z", "p10": 90, "p50": 100, "p90": 120}
  ]
}
```

Unspecified battery fields use the defaults shown above. An optional top-level `risk_profile` overrides the battery policy for that request. Responses include grid-side energy for every interval and an audit record with model version, solver settings, accounting policies and SHA-256 of the normalized effective input. The hash is an identity check, not durable run history.

Validation failures return HTTP 422 with details. Failure to prove an optimal primary schedule returns 503. Solver work is delegated to synchronous FastAPI worker threads; this is not a production job queue.

## Forecast providers

`ForecastProvider.get_forecast()` defines the integration boundary:

- `SyntheticForecastProvider`: built-in labeled fixture, no credentials.
- `CSVForecastProvider`: pandas parsing plus the same quantile/time validation used by the API.
- `ParisiForecastProvider`: unimplemented adapter boundary. Without endpoint/credentials it raises a configuration error. Even when they are supplied, it raises an explicit unimplemented-contract error; it never makes a network request or guesses an endpoint.

Real integration requires approved API access, documentation, authentication, node/forecast identifiers, issuance timestamps, revision semantics and stale-data policy. Add the documented adapter and contract tests only after those are known.

## Testing strategy

```bash
cd backend
.venv/bin/python -m pytest -q
# Windows: .venv\Scripts\python -m pytest -q
cd ../frontend
npm run typecheck
npm run build
```

The suite covers maximum/minimum SOC, charge/discharge power, efficiency conservation, exclusivity, terminal energy, zero/tight cycle limits, sensible overnight charging/evening discharge, uncertainty-driven policy differences, deterministic outputs, explanation correspondence, conditional alternatives, invalid shadow schedules, provider failures, CSV/JSON ingestion and API contracts. CI runs Python tests, TypeScript checks, production compilation and a Docker Compose smoke test.

## Reliability philosophy

Make the model earn its place in the pipeline. Probabilistic forecasting is useful where uncertainty matters. Physical constraints, validation, accounting and policy enforcement belong in deterministic code. The value of the system comes from assigning each component the problem it can solve and exposing enough evidence for an operator to challenge the recommendation.

## What a production integration would require

Live SOC/telemetry, availability and outages, existing positions, day-ahead schedules, bids/offers, real-time markets, ancillary commitments, degradation, operator overrides and persistent audit history. Data freshness and node matching must be checked before optimization. The useful horizon and receding-horizon execution policy should follow the customer's actual decision cadence.

The FDE work is as much understanding which decisions remain discretionary as implementing another objective function.

## What I would validate with the operator next

- **Decision scope:** Are we optimizing energy schedules, bids, day-ahead positions, real-time dispatch or ancillary products?
- **Discretion:** Which decisions and capacity are precommitted, contractual or truly operator-controlled?
- **Dynamic constraints:** How do available power, usable capacity, temperature, outages and reserve floors change?
- **Degradation:** Is wear represented as marginal throughput cost, cycle depth, age-dependent curves or another asset value model?
- **Horizon:** Which forecast window and update cadence actually drive decisions? What should ending SOC be worth?
- **Credible improvement:** Which agreed baseline and metrics define success—net margin, missed opportunities, time saved, fewer violations or confidence?
- **Abstention:** When should stale forecasts, missing telemetry, uncertainty or inconsistent inputs prevent a recommendation?
- **Evidence:** Which distributions, binding constraints, alternative actions and sensitivity results must accompany each recommendation?
- **Approval:** Which actions need operator approval, and what limited boundaries could eventually permit assisted execution?

## Limitations

Single asset; one energy product; fixed 15-minute intervals; at most 24 hours. No battery degradation curves, bidding mechanics, ancillary services, nodal congestion, transmission constraints, scenario tree, telemetry failures, settlement mechanics, dynamic availability or portfolio coordination. No database, authentication, multi-tenancy, LLM chat or custom forecasting model.

Quantile weighting is a heuristic; perfect knowledge of a forecast horizon is assumed. Prices are exogenous and the asset cannot move the market. The terminal equality and prorated cycle budget are simplifying policies. There is no stale-forecast rejection because the dated synthetic fixture is intentionally replayable. The service is for trusted local use, not internet exposure or live operational control.

Estimated gross value is not net asset value or realized revenue. The synthetic fixture cannot substantiate investment or trading performance.

## Why this is an FDE prototype

The workflow starts with an operator question, makes constraints explicit, connects a predictive signal, delivers something inspectable, measures against the current plan, and exposes explanations. It translates between customer language, operating reality, data, software, models and product. Customer-specific policy stays separate from reusable ingestion, optimization, accounting and explanation components.

## Possible next steps

Prioritize through operator feedback: approved forecast integration, historical backtesting, degradation-aware objectives, stochastic optimization, telemetry import, richer operating policies, durable shadow history, overrides, data quality monitoring and multiple settlement locations. These are future integration questions, not claims of current capability.

## Project status and disclaimer

Prototype. Demonstrates constrained decisions, probabilistic forecast consumption, operational integration, explainability and shadow evaluation. Not intended for live market operation.

GridDispatch is an independent engineering prototype. It is **not affiliated with, endorsed by, or developed with Parisi Labs**. Included data is synthetic and solely for demonstration. Outputs are not financial, trading or operational advice.
