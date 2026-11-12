from __future__ import annotations

import asyncio
import base64
import uuid
from io import BytesIO
from pathlib import Path

import httpx
import pytest
from PIL import Image

from app.core.config import Settings
from app.services.image_service import ImageGenerator
from app.services.reference_service import (
    ReferenceImageError,
    resolve_reference_paths,
    save_reference_images,
)


def _png_data_url() -> str:
    buffer = BytesIO()
    Image.new("RGB", (32, 32), "white").save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def test_reference_images_are_saved_and_resolved(tmp_path: Path) -> None:
    generation_id = uuid.uuid4()
    saved = save_reference_images(
        [_png_data_url()],
        generation_id,
        tmp_path,
    )

    assert len(saved) == 1
    assert saved[0].path.is_file()
    assert resolve_reference_paths([saved[0].url], tmp_path) == [saved[0].path]


def test_invalid_reference_data_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ReferenceImageError):
        save_reference_images(
            ["data:image/png;base64,bm90LWFuLWltYWdl"],
            uuid.uuid4(),
            tmp_path,
        )


def test_reference_image_uses_openai_edit_endpoint(tmp_path: Path) -> None:
    reference = tmp_path / "reference.png"
    Image.new("RGB", (32, 32), "white").save(reference, format="PNG")
    output = BytesIO()
    Image.new("RGB", (64, 64), "#f2f2f2").save(output, format="PNG")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/images/edits"
        assert request.headers["content-type"].startswith("multipart/form-data")
        assert b'name="image[]"' in request.content
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "b64_json": base64.b64encode(output.getvalue()).decode(
                            "ascii"
                        )
                    }
                ]
            },
        )

    async def run() -> None:
        settings = Settings(
            gpt_image_api_key="test-key",
            gpt_image_api_base_url="https://images.example/v1",
        )
        generator = ImageGenerator(settings, provider="openai", model="z-image-2.5")
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ) as client:
            result = await generator._generate_openai_edit(
                client,
                "maintain the character's appearance",
                None,
                960,
                1280,
                None,
                [reference],
            )
        assert result.content == output.getvalue()

    asyncio.run(run())
