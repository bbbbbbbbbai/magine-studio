from __future__ import annotations

from dataclasses import dataclass

from app.core.config import Settings


@dataclass(frozen=True)
class ImageModelSpec:
    id: str
    label: str
    provider: str
    model: str
    requires_api_key: bool
    supports_references: bool
    description: str


def image_model_specs(settings: Settings) -> tuple[ImageModelSpec, ...]:
    return (
        ImageModelSpec(
            id="flux",
            label="Flux",
            provider="pollinations",
            model=settings.pollinations_model,
            requires_api_key=False,
            supports_references=False,
            description="免费快速模型，适合草稿与日常创作",
        ),
        ImageModelSpec(
            id="z-image-2.5",
            label="Z-image2.5",
            provider="openai",
            model=settings.z_image_model,
            requires_api_key=True,
            supports_references=True,
            description="默认角色与参考图模型，支持多参考图编辑",
        ),
        ImageModelSpec(
            id="gpt-image-2.5",
            label="GPT Image 2.5",
            provider="openai",
            model=settings.gpt_image_model,
            requires_api_key=True,
            supports_references=True,
            description="高质量封面模型，需要配置独立 API Key",
        ),
        ImageModelSpec(
            id="qwen-image-3-pro",
            label="Qwen Image 3 Pro",
            provider="openai",
            model="qwen-image-3-pro",
            requires_api_key=True,
            supports_references=True,
            description="中文语义理解与文字排版表现稳定",
        ),
        ImageModelSpec(
            id="z-image-pro",
            label="Z-Image Pro",
            provider="openai",
            model="z-image-pro",
            requires_api_key=True,
            supports_references=True,
            description="适合写实人物、商业视觉与高质量细节",
        ),
        ImageModelSpec(
            id="anime-v4-5",
            label="Anime V4.5",
            provider="openai",
            model="anime-v4-5",
            requires_api_key=True,
            supports_references=True,
            description="通用日系动漫插画模型",
        ),
        ImageModelSpec(
            id="seedream-5-pro",
            label="Seedream 5 Pro",
            provider="openai",
            model="seedream-5-pro",
            requires_api_key=True,
            supports_references=True,
            description="适合电影感场景、海报与复杂构图",
        ),
        ImageModelSpec(
            id="anime-v5",
            label="Anime V5",
            provider="openai",
            model="anime-v5",
            requires_api_key=True,
            supports_references=True,
            description="更强调角色表现与动漫质感的版本",
        ),
    )


def resolve_image_model(
    settings: Settings,
    requested: str | None = None,
) -> ImageModelSpec:
    identifier = (requested or settings.image_model).strip()
    for spec in image_model_specs(settings):
        if identifier in {spec.id, spec.model}:
            return spec

    # Preserve compatibility with existing IMAGE_PROVIDER/IMAGE_MODEL deployments.
    return ImageModelSpec(
        id=identifier,
        label=identifier,
        provider=settings.image_provider,
        model=identifier,
        requires_api_key=settings.image_provider == "openai",
        supports_references=settings.image_provider == "openai",
        description="由环境变量配置的自定义图片模型",
    )


def image_model_configured(settings: Settings, spec: ImageModelSpec) -> bool:
    if not spec.requires_api_key:
        return True
    key = settings.gpt_image_api_key or settings.image_api_key
    return bool(key and key.get_secret_value().strip())
