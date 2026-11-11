from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Imagine Studio API"
    app_env: Literal["development", "test", "production"] = "development"
    api_prefix: str = "/api/v1"

    database_url: str = (
        "postgresql+asyncpg://imagine:imagine_dev_password@localhost:5432/imagine"
    )
    database_echo: bool = False
    auto_create_tables: bool = True

    llm_model: str = "deepseek-v4-flash-vision-exp"
    llm_api_key: SecretStr | None = None
    llm_base_url: str = "https://api.deepseek.com"
    llm_temperature: float = 0.4

    image_provider: Literal["pollinations", "openai"] = "pollinations"
    image_model: str = "flux"
    pollinations_model: str = "flux"
    gpt_image_model: str = "gpt-image-2.5"
    gpt_image_api_base_url: str = ""
    gpt_image_api_key: SecretStr | None = None
    image_api_base_url: str = "https://api.openai.com/v1"
    image_api_key: SecretStr | None = None
    image_timeout_seconds: int = 150

    media_dir: Path = Path("media")
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_api_key and self.llm_api_key.get_secret_value().strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
