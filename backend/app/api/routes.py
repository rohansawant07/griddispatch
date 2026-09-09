import csv
import json
from io import StringIO
from fastapi import APIRouter, UploadFile, File
from app.models.battery import Battery
from app.models.dispatch import (
    OptimizeRequest,
    CompareRequest,
    ExplainRequest,
    DispatchResult,
)
from app.models.forecast import ForecastPoint, validate_horizon
from app.providers.synthetic import SyntheticForecastProvider, DATA
from app.providers.csv_provider import CSVForecastProvider
from app.services.application import run_dispatch, explain_alternatives
from app.services.comparison import compare, scenarios

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "model_version": "1.0.0"}


@router.get("/demo/battery", response_model=Battery)
def demo_battery():
    return Battery()


@router.get("/demo/forecast")
def demo_forecast():
    return {
        "source": "Synthetic demo data — not historical or vendor data",
        "forecast": SyntheticForecastProvider().get_forecast(),
    }


@router.get("/demo/baseline")
def demo_baseline():
    with (DATA / "baseline_schedule.csv").open() as f:
        return list(csv.DictReader(f))


@router.post("/forecast/import")
async def import_forecast(file: UploadFile = File(...)):
    raw = await file.read(1_000_001)
    if len(raw) > 1_000_000:
        raise ValueError("forecast upload exceeds 1 MB")
    text = raw.decode("utf-8-sig")
    if (file.filename or "").lower().endswith(".csv"):
        points = CSVForecastProvider(StringIO(text)).get_forecast()
    elif (file.filename or "").lower().endswith(".json"):
        data = json.loads(text)
        if not isinstance(data, list):
            raise ValueError(
                "JSON forecast must be an array of timestamp,p10,p50,p90 records"
            )
        points = validate_horizon([ForecastPoint.model_validate(p) for p in data])
    else:
        raise ValueError("upload a .csv or .json forecast")
    return {
        "source": "Operator uploaded forecast (provenance not verified)",
        "forecast": points,
    }


@router.post("/optimize", response_model=DispatchResult)
def optimize_route(request: OptimizeRequest):
    return run_dispatch(request)


@router.post("/compare")
def compare_route(request: CompareRequest):
    return compare(request)


@router.post("/scenarios")
def scenarios_route(request: OptimizeRequest):
    return scenarios(request)


@router.post("/explain")
def explain_route(request: ExplainRequest):
    return explain_alternatives(request)
