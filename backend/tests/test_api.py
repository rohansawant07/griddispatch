import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.providers.synthetic import DATA
from app.providers.parisi import ParisiForecastProvider

client = TestClient(app)


def payload():
    return {
        "battery": client.get("/demo/battery").json(),
        "forecast": client.get("/demo/forecast").json()["forecast"],
    }


def test_contract():
    assert client.get("/health").json()["status"] == "ok"
    p = payload()
    result = client.post("/optimize", json=p)
    assert result.status_code == 200, result.text
    data = result.json()
    assert set(data) == {"summary", "schedule", "explanations", "audit"}
    assert len(data["schedule"]) == 96
    scenarios = client.post("/scenarios", json=p)
    assert scenarios.status_code == 200
    assert set(scenarios.json()) == {"conservative", "neutral", "aggressive"}
    comparison = client.post(
        "/compare", json={**p, "baseline": client.get("/demo/baseline").json()}
    )
    assert comparison.status_code == 200, comparison.text
    assert (
        comparison.json()["recommended"]["audit"]["input_sha256"]
        == data["audit"]["input_sha256"]
    )
    explain = client.post("/explain", json={**p, "interval_index": 40})
    assert explain.status_code == 200
    assert len(explain.json()["alternatives"]) == 2


@pytest.mark.parametrize(
    "kind",
    [
        "order",
        "duplicate",
        "gap",
        "quantiles",
        "timezone",
        "too_short",
        "too_long",
        "invalid_battery",
    ],
)
def test_invalid_payloads_return_422(kind):
    p = payload()
    if kind == "order":
        p["forecast"].reverse()
    if kind == "duplicate":
        p["forecast"][1] = p["forecast"][0]
    if kind == "gap":
        p["forecast"].pop(3)
    if kind == "quantiles":
        p["forecast"][0]["p10"] = 1000
    if kind == "timezone":
        p["forecast"][0]["timestamp"] = "2026-09-09T00:00:00"
    if kind == "too_short":
        p["forecast"] = p["forecast"][:1]
    if kind == "too_long":
        p["forecast"] *= 2
    if kind == "invalid_battery":
        p["battery"]["max_soc"] = 0.1
    assert client.post("/optimize", json=p).status_code == 422


def test_csv_and_json_ingestion():
    text = (DATA / "synthetic_forecast.csv").read_text()
    csv_result = client.post(
        "/forecast/import", files={"file": ("forecast.csv", text, "text/csv")}
    )
    assert csv_result.status_code == 200
    json_result = client.post(
        "/forecast/import",
        files={
            "file": (
                "forecast.json",
                json.dumps(payload()["forecast"]),
                "application/json",
            )
        },
    )
    assert json_result.status_code == 200
    assert csv_result.json()["forecast"] == json_result.json()["forecast"]
    assert (
        client.post(
            "/forecast/import",
            files={"file": ("bad.csv", "timestamp,p50\nfoo,NaN", "text/csv")},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/forecast/import", files={"file": ("bad.json", "{}", "application/json")}
        ).status_code
        == 422
    )


def test_risk_override():
    p = payload()
    p["risk_profile"] = "conservative"
    result = client.post("/optimize", json=p)
    assert result.status_code == 200
    assert result.json()["audit"]["risk_profile"] == "conservative"


def test_parisi_never_pretends_to_connect():
    for provider in [
        ParisiForecastProvider(),
        ParisiForecastProvider("https://example.invalid", "example"),
    ]:
        with pytest.raises(ValueError, match="No network request was made"):
            provider.get_forecast()
