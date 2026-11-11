from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

import app.api.routes.generations as generation_routes
from app.core.config import get_settings
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
    assert config.json()["default_image_model"] == "flux"
    models = {
        item["id"]: item for item in config.json()["available_image_models"]
    }
    assert models["flux"]["provider"] == "pollinations"
    assert models["flux"]["configured"] is True
    assert models["gpt-image-2.5"]["provider"] == "openai"
    assert {
        "qwen-image-3-pro",
        "z-image-pro",
        "anime-v4-5",
        "seedream-5-pro",
        "anime-v5",
    }.issubset(models)

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
    assert task["provider"] == "pollinations"
    assert task["model"] == "flux"
    assert task["width"] == 1344
    assert task["height"] == 768

    listed = client.get("/api/v1/generations")
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1
    assert any(item["id"] == task["id"] for item in listed.json()["items"])


def test_gpt_image_requires_api_key(client: TestClient) -> None:
    settings = get_settings()
    if settings.gpt_image_api_key or settings.image_api_key:
        pytest.skip("A real image API key is configured in this environment")

    response = client.post(
        "/api/v1/generations",
        json={
            "prompt": "放学后的天台，橘色夕阳落在少女肩头",
            "style": "illustration",
            "aspect_ratio": "3:4",
            "image_model": "gpt-image-2.5",
            "enhance_prompt": True,
        },
    )
    assert response.status_code == 400
    assert "GPT_IMAGE_API_KEY" in response.json()["detail"]
