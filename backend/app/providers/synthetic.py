from pathlib import Path
from app.providers.csv_provider import CSVForecastProvider

DATA = Path(__file__).resolve().parents[1] / "data"


class SyntheticForecastProvider(CSVForecastProvider):
    """Synthetic demo data; not historical prices or a vendor forecast."""

    def __init__(self):
        super().__init__(DATA / "synthetic_forecast.csv")
