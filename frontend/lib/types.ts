export type Risk = "conservative" | "neutral" | "aggressive";
export type Action = "CHARGE" | "HOLD" | "DISCHARGE";
export type Battery = {
  name: string;
  power_mw: number;
  energy_mwh: number;
  initial_soc: number;
  min_soc: number;
  max_soc: number;
  charge_efficiency: number;
  discharge_efficiency: number;
  max_cycles_per_day: number;
  settlement_node: string;
  risk_profile: Risk;
  aggressive_weight: number;
};
export type Forecast = {
  timestamp: string;
  p10: number;
  p50: number;
  p90: number;
};
export type Baseline = { timestamp: string; action: Action; power_mw: number };
export type Interval = Baseline & {
  charge_mw: number;
  discharge_mw: number;
  energy_charged_mwh: number;
  energy_discharged_mwh: number;
  soc_before: number;
  soc_after: number;
  expected_price: number;
  effective_buy_price: number;
  effective_sell_price: number;
  estimated_gross_value: number;
};
export type Summary = {
  estimated_gross_value: number;
  policy_objective_value: number;
  ending_soc: number;
  energy_charged_mwh: number;
  energy_discharged_mwh: number;
  equivalent_cycles: number;
  cycle_budget: number;
  dispatch_intervals: number;
};
export type Explanation = {
  timestamp: string;
  action: Action;
  power_mw: number;
  soc_before: number;
  soc_after: number;
  forecast: Forecast;
  reason: string;
  binding_constraints: string[];
  decision_drivers: string[];
  what_could_change: string;
};
export type Result = {
  summary: Summary;
  schedule: Interval[];
  explanations: Explanation[];
  audit: {
    input_sha256: string;
    model_version: string;
    status: string;
    risk_profile: Risk;
  };
};
export type Comparison = {
  baseline: { summary: Summary; schedule: Interval[] };
  recommended: Result;
  estimated_difference: number;
  differing_intervals: number[];
};
export type Alternative = {
  action: Action;
  minimum_power_mw: number;
  feasible: boolean;
  policy_value_loss?: number;
  estimated_gross_value?: number;
  description: string;
};
export type Input = { battery: Battery; forecast: Forecast[] };
