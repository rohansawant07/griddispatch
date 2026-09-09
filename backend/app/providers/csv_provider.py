from pathlib import Path
from io import StringIO
import pandas as pd
from app.models.forecast import ForecastPoint, validate_horizon
from app.providers.base import ForecastProvider


class CSVForecastProvider(ForecastProvider):
    def __init__(self, source: Path | StringIO):
        self.source = source

    def get_forecast(self):
        try:
            frame = pd.read_csv(self.source)
        except (pd.errors.ParserError, pd.errors.EmptyDataError) as exc:
            raise ValueError("Invalid forecast CSV") from exc
        if set(frame.columns) != {"timestamp", "p10", "p50", "p90"}:
            raise ValueError("CSV requires exactly timestamp,p10,p50,p90 columns")
        return validate_horizon(
            [ForecastPoint.model_validate(row) for row in frame.to_dict("records")]
        )
