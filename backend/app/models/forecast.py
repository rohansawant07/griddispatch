from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ForecastPoint(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    timestamp: datetime
    p10: float = Field(ge=-10000, le=100000)
    p50: float = Field(ge=-10000, le=100000)
    p90: float = Field(ge=-10000, le=100000)

    @field_validator("timestamp")
    @classmethod
    def utc_timestamp(cls, value):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must include timezone; use Z for UTC")
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def ordered_quantiles(self):
        if not self.p10 <= self.p50 <= self.p90:
            raise ValueError("quantiles must satisfy p10 <= p50 <= p90")
        return self


def validate_horizon(points):
    if not 2 <= len(points) <= 96:
        raise ValueError("forecast must contain 2–96 consecutive 15-minute intervals")
    for a, b in zip(points, points[1:]):
        if (b.timestamp - a.timestamp).total_seconds() != 900:
            raise ValueError(
                "forecast must be ordered, unique, and spaced exactly 15 minutes apart"
            )
    return points
