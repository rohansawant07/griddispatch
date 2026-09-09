from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.battery import Battery, RiskProfile
from app.models.forecast import ForecastPoint, validate_horizon

Action = Literal["CHARGE", "HOLD", "DISCHARGE"]


class OptimizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    battery: Battery
    forecast: list[ForecastPoint]
    risk_profile: RiskProfile | None = None

    @field_validator("forecast")
    @classmethod
    def horizon(cls, v):
        return validate_horizon(v)


class BaselinePoint(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    timestamp: datetime
    action: Action
    power_mw: float = Field(ge=0)

    @field_validator("timestamp")
    @classmethod
    def utc_timestamp(cls, v):
        return ForecastPoint.utc_timestamp(v)


class CompareRequest(OptimizeRequest):
    baseline: list[BaselinePoint]


class ExplainRequest(OptimizeRequest):
    interval_index: int = Field(ge=0)


class DispatchInterval(BaseModel):
    timestamp: datetime
    action: Action
    power_mw: float
    charge_mw: float
    discharge_mw: float
    energy_charged_mwh: float
    energy_discharged_mwh: float
    soc_before: float
    soc_after: float
    expected_price: float
    effective_buy_price: float
    effective_sell_price: float
    estimated_gross_value: float


class Summary(BaseModel):
    estimated_gross_value: float
    policy_objective_value: float
    ending_soc: float
    energy_charged_mwh: float
    energy_discharged_mwh: float
    equivalent_cycles: float
    cycle_budget: float
    dispatch_intervals: int


class Explanation(BaseModel):
    timestamp: datetime
    action: Action
    power_mw: float
    soc_before: float
    soc_after: float
    forecast: ForecastPoint
    reason: str
    binding_constraints: list[str]
    decision_drivers: list[str]
    what_could_change: str


class DispatchResult(BaseModel):
    summary: Summary
    schedule: list[DispatchInterval]
    explanations: list[Explanation]
    audit: dict
