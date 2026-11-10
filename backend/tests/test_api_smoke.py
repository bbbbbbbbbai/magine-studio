from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

import app.api.routes.generations as generation_routes
from app.main import app


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    async def fake_process_generation(_: object) -> None:
        return None

    monkeypatch.setattr(generation_routes, "process_generation", fake_process_generation)
    with TestClient(app) as test_client:
        yield test_client


def test_api_smoke_flow(client: TestClient) -> None:
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    config = client.get("/api/v1/config")
    assert config.status_code == 200
    assert config.json()["llm_model"] == "deepseek-v4-flash-vision-exp"
    assert config.json()["llm_configured"] is False

    created = client.post(
        "/api/v1/generations",
        json={
            "prompt": "一座漂浮在云海上的未来图书馆",
            "style": "cinematic",
            "aspect_ratio": "16:9",
            "enhance_prompt": True,
        },
    )
    assert created.status_code == 202
    task = created.json()
    assert task["status"] == "pending"
    assert task["width"] == 1344
    assert task["height"] == 768

    listed = client.get("/api/v1/generations")
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1
    assert any(item["id"] == task["id"] for item in listed.json()["items"])
