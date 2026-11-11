from __future__ import annotations

import base64
import hashlib
import random
from dataclasses import dataclass
from urllib.parse import quote

import httpx

from app.core.config import Settings
from app.services.exceptions import ImageGenerationError


@dataclass(frozen=True)
class GeneratedImage:
    content: bytes
    extension: str
    content_type: str


def _extension_for_content_type(content_type: str) -> str:
    if "jpeg" in content_type or "jpg" in content_type:
        return "jpg"
    if "webp" in content_type:
        return "webp"
    if "avif" in content_type:
        return "avif"
    return "png"


class ImageGenerator:
    def __init__(
        self,
        settings: Settings,
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> None:
        self.settings = settings
        self.provider = provider or settings.image_provider
        self.model = model or settings.image_model

    async def generate(
        self,
        *,
        prompt: str,
        negative_prompt: str | None,
        width: int,
        height: int,
        seed: int | None,
    ) -> GeneratedImage:
        timeout = httpx.Timeout(self.settings.image_timeout_seconds, connect=20)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            if self.provider == "pollinations":
                final_prompt = prompt
                if negative_prompt:
                    final_prompt += f". Avoid: {negative_prompt}"
                return await self._generate_pollinations(
                    client, final_prompt, width, height, seed
                )
            return await self._generate_openai_compatible(
                client, prompt, negative_prompt, width, height, seed
            )

    async def _generate_pollinations(
        self,
        client: httpx.AsyncClient,
        prompt: str,
        width: int,
        height: int,
        seed: int | None,
    ) -> GeneratedImage:
        actual_seed = seed if seed is not None else random.randint(1, 2_147_483_647)
        url = f"https://image.pollinations.ai/prompt/{quote(prompt, safe='')}"
        params = {
            "width": width,
            "height": height,
            "model": self.model,
            "seed": actual_seed,
            "nologo": "true",
        }
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ImageGenerationError(
                "图片服务暂时不可用，请稍后重试或检查 IMAGE_PROVIDER 配置。"
            ) from exc

        content_type = response.headers.get("content-type", "image/png").split(";")[0]
        if not content_type.startswith("image/"):
            raise ImageGenerationError("图片服务返回了无效内容，请检查服务配置。")
        return GeneratedImage(
            response.content,
            _extension_for_content_type(content_type),
            content_type,
        )

    async def _generate_openai_compatible(
        self,
        client: httpx.AsyncClient,
        prompt: str,
        negative_prompt: str | None,
        width: int,
        height: int,
        seed: int | None,
    ) -> GeneratedImage:
        configured_key = self.settings.gpt_image_api_key or self.settings.image_api_key
        api_key = (
            configured_key.get_secret_value().strip() if configured_key else ""
        )
        if not api_key:
            raise ImageGenerationError(
                "GPT Image 2.5 尚未配置 API Key，请设置 GPT_IMAGE_API_KEY 或 IMAGE_API_KEY。"
            )

        final_prompt = prompt
        if negative_prompt:
            final_prompt += f"\nDo not include: {negative_prompt}"
        openai_size = (
            "1024x1024"
            if width == height
            else "1536x1024"
            if width > height
            else "1024x1536"
        )
        payload: dict[str, object] = {
            "model": self.model,
            "prompt": final_prompt,
            "size": openai_size,
            "n": 1,
        }
        if seed is not None:
            payload["seed"] = seed

        base_url = (
            self.settings.gpt_image_api_base_url.strip()
            or self.settings.image_api_base_url
        )
        endpoint = f"{base_url.rstrip('/')}/images/generations"
        try:
            response = await client.post(
                endpoint,
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            response.raise_for_status()
            body = response.json()
            image_data = body["data"][0]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise ImageGenerationError(
                "图片生成服务调用失败，请检查图片模型、尺寸与接口配置。"
            ) from exc

        if encoded := image_data.get("b64_json"):
            try:
                content = base64.b64decode(encoded)
                return GeneratedImage(content, "png", "image/png")
            except (ValueError, TypeError) as exc:
                raise ImageGenerationError("图片服务返回了无法解析的图片数据。") from exc

        if image_url := image_data.get("url"):
            try:
                download = await client.get(image_url)
                download.raise_for_status()
                content_type = download.headers.get("content-type", "image/png").split(";")[0]
                return GeneratedImage(
                    download.content,
                    _extension_for_content_type(content_type),
                    content_type,
                )
            except httpx.HTTPError as exc:
                raise ImageGenerationError("生成成功，但图片下载失败，请稍后重试。") from exc

        raise ImageGenerationError("图片服务未返回图片内容。")

    @staticmethod
    def build_request_fingerprint(prompt: str, seed: int | None) -> str:
        raw = f"{prompt}:{seed if seed is not None else 'random'}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
