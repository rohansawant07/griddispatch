from app.providers.base import ForecastProvider, ProviderConfigurationError


class ParisiForecastProvider(ForecastProvider):
    def __init__(self, endpoint: str | None = None, api_key: str | None = None):
        self.endpoint = endpoint
        self.api_key = api_key

    def get_forecast(self):
        if not self.endpoint or not self.api_key:
            raise ProviderConfigurationError(
                "Parisi integration is not configured. Supply an approved endpoint and credentials, "
                "then implement the documented API contract. No network request was made."
            )
        raise ProviderConfigurationError(
            "Parisi adapter is not implemented: approved API documentation, node and issuance "
            "mapping are required. No network request was made."
        )
