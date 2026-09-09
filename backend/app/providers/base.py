from abc import ABC, abstractmethod
from app.models.forecast import ForecastPoint


class ForecastProvider(ABC):
    @abstractmethod
    def get_forecast(self) -> list[ForecastPoint]:
        """Return validated chronological forecast intervals."""


class ProviderConfigurationError(ValueError):
    pass
