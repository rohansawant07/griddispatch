from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

RiskProfile = Literal["conservative", "neutral", "aggressive"]


class Battery(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    name: str = Field(default="ERCOT Battery 01", min_length=1, max_length=100)
    power_mw: float = Field(default=100, gt=0, le=10000)
    energy_mwh: float = Field(default=200, gt=0, le=100000)
    initial_soc: float = Field(default=0.54, ge=0, le=1)
    min_soc: float = Field(default=0.10, ge=0, lt=1)
    max_soc: float = Field(default=0.95, gt=0, le=1)
    charge_efficiency: float = Field(default=0.94, gt=0, le=1)
    discharge_efficiency: float = Field(default=0.94, gt=0, le=1)
    max_cycles_per_day: float = Field(default=1.5, ge=0, le=20)
    settlement_node: str = Field(default="DEMO_NODE", min_length=1, max_length=100)
    risk_profile: RiskProfile = "neutral"
    aggressive_weight: float = Field(default=0.35, ge=0, le=1)

    @model_validator(mode="after")
    def validate_soc(self):
        if not self.min_soc < self.max_soc:
            raise ValueError("min_soc must be less than max_soc")
        if not self.min_soc <= self.initial_soc <= self.max_soc:
            raise ValueError("initial_soc must lie within the SOC bounds")
        return self
