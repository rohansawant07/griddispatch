# Architecture notes

The API layer validates transport models and invokes application services. `application.py` resolves a risk override, invokes the solver, builds explanations and hashes the effective input. No dispatch rule runs in Next.js.

`risk.py` is the sole quantile-to-effective-price mapping. `optimizer.py` constructs a mixed-integer linear model. `accounting.py` independently reconstructs energy and value from grid-side power; both solved and baseline schedules pass through it. `explanations.py` describes output evidence, while conditional alternatives re-enter the optimizer. Comparison reports use one common p50 valuation even when objectives differ.

A successful response therefore follows:

1. Pydantic battery, forecast and cadence validation.
2. Explicit risk transformation.
3. Proven-optimal MILP, followed by minimum-throughput tie handling.
4. Independent numerical constraint/accounting check.
5. Deterministic evidence and normalized-input hash.
6. Rendering against an immutable last-run UI snapshot.

## Key choices

- Grid-side charge/discharge powers; cell-side SOC and cycle accounting.
- Exact restored terminal SOC avoids initial-inventory liquidation as apparent improvement.
- Throughput uses nameplate capacity, not usable SOC range; daily allowance is prorated to elapsed horizon.
- Bounds reported in explanations are tight constraints, not causal explanations from LP duals (binary models do not generally supply useful marginal prices).
- Alternative tests report actual constrained re-solves rather than invented thresholds.
- Unknown vendor integration fails closed; the demo has no external dependency.
- Next.js proxies a fixed allowlist of backend routes; Docker changes only the server-side backend address.
- No persistence or execution connectors. Audit hashes identify normalized inputs but are not a regulatory audit ledger.

The operating-policy assumptions, not the optimizer library, are the first things to validate with a customer. See the operator questions in the README.
