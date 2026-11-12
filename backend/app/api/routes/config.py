from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.generation import ImageModelOption, PublicConfig
from app.services.image_models import (
    image_model_configured,
    image_model_specs,
    resolve_image_model,
)

router = APIRouter(tags=["config"])
settings = get_settings()


@router.get("/config", response_model=PublicConfig)
async def public_config() -> PublicConfig:
    default_model = resolve_image_model(settings)
    return PublicConfig(
        app_name=settings.app_name,
        llm_model=settings.llm_model,
        llm_configured=settings.llm_enabled,
        image_provider=default_model.provider,
        image_model=default_model.model,
        default_image_model=default_model.id,
        available_image_models=[
            ImageModelOption(
                id=spec.id,
                label=spec.label,
                provider=spec.provider,
                model=spec.model,
                requires_api_key=spec.requires_api_key,
                configured=image_model_configured(settings, spec),
                supports_references=spec.supports_references,
                description=spec.description,
            )
            for spec in image_model_specs(settings)
        ],
        supported_ratios=["1:1", "4:3", "3:4", "16:9", "9:16"],
    )
