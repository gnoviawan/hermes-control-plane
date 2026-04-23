from fastapi.testclient import TestClient

from app.main import app


def test_health_route_smoke() -> None:
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["service"] == "Hermes Control Plane API"
    assert payload["hermes_home"] == "/opt/data"
