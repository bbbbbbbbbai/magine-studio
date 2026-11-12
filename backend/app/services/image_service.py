from __future__ import annotations

import asyncio
import base64
import hashlib
import random
import re
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from urllib.parse import quote

import httpx
from PIL import Image

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


def _remove_pollinations_watermark(content: bytes, width: int, height: int) -> bytes:
    try:
        with Image.open(BytesIO(content)) as image:
            rgb = image.convert("RGB")
            crop_height = max(24, round(rgb.height * 0.035))
            cropped = rgb.crop((0, 0, rgb.width, max(1, rgb.height - crop_height)))
            resized = cropped.resize((width, height), Image.Resampling.LANCZOS)
            output = BytesIO()
            resized.save(output, format="PNG", optimize=True)
            return output.getvalue()
    except (OSError, ValueError):
        return content


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
        reference_images: list[Path] | None = None,
    ) -> GeneratedImage:
        timeout = httpx.Timeout(self.settings.image_timeout_seconds, connect=20)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            if self.provider == "pollinations":
                if reference_images:
                    raise ImageGenerationError(
                        "当前模型不支持参考图，请切换到 Z-image2.5 或其他图像编辑模型。"
                    )
                final_prompt = prompt
                if negative_prompt:
                    final_prompt += f". Avoid: {negative_prompt}"
                return await self._generate_pollinations(
                    client, final_prompt, width, height, seed
                )
            if reference_images:
                return await self._generate_openai_edit(
                    client,
                    prompt,
                    negative_prompt,
                    width,
                    height,
                    seed,
                    reference_images,
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
        for attempt in range(2):
            try:
                response = await client.get(url, params=params)
            except httpx.HTTPError as exc:
                raise ImageGenerationError(
                    "图片服务连接失败，请稍后重试。"
                ) from exc

            if response.status_code in {402, 429} and attempt == 0:
                retry_match = re.search(r"retry after\s+(\d+)s", response.text, re.I)
                delay = (
                    int(retry_match.group(1))
                    if retry_match
                    else int(response.headers.get("retry-after", "45"))
                )
                await asyncio.sleep(min(max(delay, 5), 45))
                continue
            break

        if response.status_code in {402, 429}:
            raise ImageGenerationError(
                "Flux 免费额度暂时受限。请等待约 45 秒后重试，"
                "或在服务器配置 GPT Image 2.5 的 API Key 后切换模型。"
            )
        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ImageGenerationError(
                f"Flux 图片服务返回错误 ({response.status_code})，请稍后重试。"
            ) from exc

        content_type = response.headers.get("content-type", "image/png").split(";")[0]
        if not content_type.startswith("image/"):
            raise ImageGenerationError("图片服务返回了无效内容，请检查服务配置。")
        cleaned_content = _remove_pollinations_watermark(
            response.content,
            width,
            height,
        )
        return GeneratedImage(
            cleaned_content,
            "png",
            "image/png",
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
            if response.is_error:
                try:
                    error_body = response.json()
                    error = error_body.get("error", {})
                    error_code = error.get("code")
                    error_message = error.get("message")
                except (TypeError, ValueError):
                    error_code = None
                    error_message = None

                if error_code == "points_insufficient":
                    raise ImageGenerationError(
                        "GPT Image 2.5 账户 API 积分不足。"
                        "请先在图片服务控制台充值，再重新生成。"
                    )
                if error_message:
                    raise ImageGenerationError(
                        f"GPT Image 2.5 返回错误：{str(error_message)[:300]}"
                    )
            response.raise_for_status()
            body = response.json()
            image_data = body["data"][0]
        except ImageGenerationError:
            raise
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

    async def _generate_openai_edit(
        self,
        client: httpx.AsyncClient,
        prompt: str,
        negative_prompt: str | None,
        width: int,
        height: int,
        seed: int | None,
        reference_images: list[Path],
    ) -> GeneratedImage:
        configured_key = self.settings.gpt_image_api_key or self.settings.image_api_key
        api_key = (
            configured_key.get_secret_value().strip() if configured_key else ""
        )
        if not api_key:
            raise ImageGenerationError(
                "图片编辑模型尚未配置 API Key，请设置 GPT_IMAGE_API_KEY 或 IMAGE_API_KEY。"
            )

        missing = [str(path) for path in reference_images if not path.is_file()]
        if missing:
            raise ImageGenerationError("参考图文件不存在，请重新上传后再试。")

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
        base_url = (
            self.settings.gpt_image_api_base_url.strip()
            or self.settings.image_api_base_url
        )
        endpoint = f"{base_url.rstrip('/')}/images/edits"
        headers = {"Authorization": f"Bearer {api_key}"}

        multipart_data: dict[str, str] = {
            "model": self.model,
            "prompt": final_prompt,
            "size": openai_size,
            "n": "1",
        }
        if seed is not None:
            multipart_data["seed"] = str(seed)
        files: list[tuple[str, tuple[str, bytes, str]]] = []
        images_payload: list[dict[str, str]] = []
        for path in reference_images:
            content = await asyncio.to_thread(path.read_bytes)
            content_type = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
            }.get(path.suffix.lower(), "image/png")
            files.append(("image[]", (path.name, content, content_type)))
            images_payload.append(
                {
                    "image_url": (
                        f"data:{content_type};base64,"
                        f"{base64.b64encode(content).decode('ascii')}"
                    )
                }
            )

        try:
            response = await client.post(
                endpoint,
                headers=headers,
                data=multipart_data,
                files=files,
            )
            if response.status_code in {404, 405, 415, 422}:
                json_payload: dict[str, object] = {
                    "model": self.model,
                    "prompt": final_prompt,
                    "images": images_payload,
                    "size": openai_size,
                    "n": 1,
                }
                if seed is not None:
                    json_payload["seed"] = seed
                response = await client.post(
                    endpoint,
                    headers={**headers, "Content-Type": "application/json"},
                    json=json_payload,
                )
            if response.is_error:
                try:
                    error_body = response.json()
                    error = error_body.get("error", {})
                    error_message = error.get("message")
                except (TypeError, ValueError):
                    error_message = None
                if error_message:
                    raise ImageGenerationError(
                        f"参考图生成失败：{str(error_message)[:300]}"
                    )
            response.raise_for_status()
            body = response.json()
            image_data = body["data"][0]
        except ImageGenerationError:
            raise
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise ImageGenerationError(
                "参考图生成服务调用失败，请检查图片编辑模型与接口配置。"
            ) from exc

        if encoded := image_data.get("b64_json"):
            try:
                content = base64.b64decode(encoded)
                return GeneratedImage(content, "png", "image/png")
            except (ValueError, TypeError) as exc:
                raise ImageGenerationError("参考图生成结果无法解析。") from exc

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
                raise ImageGenerationError("图片已生成，但下载结果失败。") from exc

        raise ImageGenerationError("参考图生成服务未返回图片内容。")

    @staticmethod
    def build_request_fingerprint(prompt: str, seed: int | None) -> str:
        raw = f"{prompt}:{seed if seed is not None else 'random'}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
