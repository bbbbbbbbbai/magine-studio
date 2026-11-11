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
    description: str


def image_model_specs(settings: Settings) -> tuple[ImageModelSpec, ...]:
    return (
        ImageModelSpec(
            id="flux",
            label="Flux",
            provider="pollinations",
            model=settings.pollinations_model,
            requires_api_key=False,
            description="免费快速模型，适合草稿与日常创作",
        ),
        ImageModelSpec(
            id="gpt-image-2.5",
            label="GPT Image 2.5",
            provider="openai",
            model=settings.gpt_image_model,
            requires_api_key=True,
            description="高质量封面模型，需要配置独立 API Key",
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
        description="由环境变量配置的自定义图片模型",
    )


def image_model_configured(settings: Settings, spec: ImageModelSpec) -> bool:
    if not spec.requires_api_key:
        return True
    key = settings.gpt_image_api_key or settings.image_api_key
    return bool(key and key.get_secret_value().strip())
