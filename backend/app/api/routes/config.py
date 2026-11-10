from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.generation import PublicConfig

router = APIRouter(tags=["config"])
settings = get_settings()


@router.get("/config", response_model=PublicConfig)
async def public_config() -> PublicConfig:
    return PublicConfig(
        app_name=settings.app_name,
        llm_model=settings.llm_model,
        llm_configured=settings.llm_enabled,
        image_provider=settings.image_provider,
        image_model=settings.image_model,
        supported_ratios=["1:1", "4:3", "3:4", "16:9", "9:16"],
    )
