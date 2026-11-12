from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

AspectRatio = Literal["1:1", "4:3", "3:4", "16:9", "9:16"]

RATIO_DIMENSIONS: dict[str, tuple[int, int]] = {
    "1:1": (1024, 1024),
    "4:3": (1280, 960),
    "3:4": (960, 1280),
    "16:9": (1344, 768),
    "9:16": (768, 1344),
}


class GenerationCreate(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    negative_prompt: str | None = Field(default=None, max_length=1000)
    style: str = Field(default="none", min_length=1, max_length=50)
    aspect_ratio: AspectRatio = "1:1"
    image_model: str | None = Field(default=None, max_length=100)
    reference_images: list[str] = Field(default_factory=list, max_length=4)
    enhance_prompt: bool = True
    seed: int | None = Field(default=None, ge=0, le=2_147_483_647)

    @field_validator("prompt", "style")
    @classmethod
    def strip_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("不能为空")
        return value

    @field_validator("negative_prompt")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("reference_images")
    @classmethod
    def validate_reference_images(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values if value.strip()]
        if len(cleaned) != len(values):
            raise ValueError("参考图数据不能为空")
        return cleaned


class GenerationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_uuid: uuid.UUID | None
    prompt: str
    enhanced_prompt: str | None
    negative_prompt: str | None
    style: str
    aspect_ratio: str
    width: int
    height: int
    seed: int | None
    status: Literal["pending", "processing", "completed", "failed"]
    provider: str
    model: str
    image_url: str | None
    reference_images: list[str] = Field(default_factory=list)
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None


class GenerationList(BaseModel):
    items: list[GenerationRead]
    total: int
    limit: int
    offset: int


class ImageModelOption(BaseModel):
    id: str
    label: str
    provider: str
    model: str
    requires_api_key: bool
    configured: bool
    supports_references: bool
    description: str


class PublicConfig(BaseModel):
    app_name: str
    llm_model: str
    llm_configured: bool
    image_provider: str
    image_model: str
    default_image_model: str
    available_image_models: list[ImageModelOption]
    supported_ratios: list[str]
