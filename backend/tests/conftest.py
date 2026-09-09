import pytest
from app.models.battery import Battery
from app.models.dispatch import OptimizeRequest
from app.providers.synthetic import SyntheticForecastProvider
from app.services.application import run_dispatch


@pytest.fixture(scope="session")
def forecast():
    return SyntheticForecastProvider().get_forecast()


@pytest.fixture(scope="session")
def battery():
    return Battery()


@pytest.fixture(scope="session")
def result(battery, forecast):
    return run_dispatch(OptimizeRequest(battery=battery, forecast=forecast))
