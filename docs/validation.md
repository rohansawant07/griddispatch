# Validation record

Local verification on 2026-09-08:

- Python 3.12.12: 55 pytest tests passed. One third-party Starlette/AnyIO deprecation warning.
- TypeScript `tsc --noEmit`: passed.
- Next.js 15.5.12 production build: passed.
- Browser demo: forecast band, dispatch bars and SOC boundaries rendered; default SOC stays between 10% and 95% and returns to 54%.
- Browser shadow mode: demo baseline accepted, SOC overlay added, 32 differing intervals displayed. p50 estimates: baseline $5,419; recommended $20,590; difference +$15,171 (rounded, synthetic data).
- Browser conditional alternatives: forcing at least 1 MW charge or discharge at 00:00 produced feasible re-optimized plans, with rounded policy-value losses of $3 and $4 respectively.
- CSV/JSON ingestion, validation errors, scenario response and explanation response are covered by API contract tests.
- `docker compose config --quiet`: passed. The local Docker daemon was unavailable, so local container execution was not verified. The repository includes a CI container build/start smoke test.
- Optional WebMCP evidence registration is feature-detected. The browser context exposed no tools, so that optional integration was not verified; normal UI and API functionality were verified.

Default numerical output (before display rounding): estimated p50 gross value $20,590.38228085, ending SOC 0.5400000005, 1.499999979 equivalent cycles, 319.14893175 MWh grid-side charge, 281.999996 MWh grid-side discharge. Floating-point SOC deviations are within the documented solver tolerance.

These are fixture-based implementation checks, not financial performance validation.
