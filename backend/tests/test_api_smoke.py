import base64
from collections.abc import Iterator
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import SecretStr

import app.api.routes.generations as generation_routes
from app.core.config import get_settings
from app.main import app
from tests.conftest import TEST_USER_ID


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    async def fake_process_generation(_: object) -> None:
        return None

    monkeypatch.setattr(generation_routes, "process_generation", fake_process_generation)
    with TestClient(app) as test_client:
        test_client.headers.update({"X-User-ID": str(TEST_USER_ID)})
        initialized = test_client.post(
            "/api/v1/users/initialize",
            json={"id": str(TEST_USER_ID)},
        )
        assert initialized.status_code == 200
        yield test_client


def test_api_smoke_flow(client: TestClient) -> None:
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    config = client.get("/api/v1/config")
    assert config.status_code == 200
    assert config.json()["llm_model"] == "deepseek-v4-flash-vision-exp"
    assert config.json()["llm_configured"] is False
    assert config.json()["default_image_model"] == "z-image-2.5"
    models = {
        item["id"]: item for item in config.json()["available_image_models"]
    }
    assert models["flux"]["provider"] == "pollinations"
    assert models["flux"]["configured"] is True
    assert models["gpt-image-2.5"]["provider"] == "openai"
    assert models["z-image-2.5"]["supports_references"] is True
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
            "style": "realistic",
            "aspect_ratio": "16:9",
            "image_model": "flux",
            "enhance_prompt": True,
        },
    )
    assert created.status_code == 202
    task = created.json()
    assert task["status"] == "pending"
    assert task["user_uuid"] == str(TEST_USER_ID)
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


def test_reference_image_is_saved_with_generation(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "gpt_image_api_key", SecretStr("test-key"))
    buffer = BytesIO()
    Image.new("RGB", (32, 32), "white").save(buffer, format="PNG")
    data_url = (
        "data:image/png;base64,"
        + base64.b64encode(buffer.getvalue()).decode("ascii")
    )

    response = client.post(
        "/api/v1/generations",
        json={
            "prompt": "保持人物外观，换成新的服装",
            "style": "illustration",
            "aspect_ratio": "3:4",
            "image_model": "z-image-2.5",
            "reference_images": [data_url],
            "enhance_prompt": True,
        },
    )

    assert response.status_code == 202
    generation = response.json()
    assert len(generation["reference_images"]) == 1
    media_path = settings.media_dir / generation["reference_images"][0].removeprefix(
        "/media/"
    )
    assert media_path.is_file()

    media_path.unlink()


def test_user_roles_and_generation_isolation(client: TestClient) -> None:
    current = client.get("/api/v1/users/me")
    assert current.status_code == 200
    assert current.json()["role"] == "root"

    repeated = client.post(
        "/api/v1/users/initialize",
        json={"id": str(TEST_USER_ID)},
    )
    assert repeated.status_code == 200
    assert repeated.json()["role"] == "root"

    other_id = "22222222-2222-4222-8222-222222222222"
    initialized = client.post(
        "/api/v1/users/initialize",
        json={"id": other_id},
    )
    assert initialized.status_code == 200
    assert initialized.json()["role"] == "guest"

    root_items = client.get("/api/v1/generations").json()["items"]
    other_items = client.get(
        "/api/v1/generations",
        headers={"X-User-ID": other_id},
    ).json()["items"]
    assert root_items
    assert other_items == []
