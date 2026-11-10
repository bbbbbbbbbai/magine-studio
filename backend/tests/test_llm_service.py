import pytest

from app.core.config import Settings
from app.services.llm_service import PromptEnhancer


@pytest.mark.asyncio
async def test_prompt_enhancement_has_offline_fallback() -> None:
    settings = Settings(_env_file=None, llm_api_key=None)
    result = await PromptEnhancer(settings).enhance(
        "a quiet library above the clouds",
        "cinematic",
        "16:9",
    )

    assert result.startswith("a quiet library above the clouds")
    assert "cinematic photography" in result
    assert "16:9" in result
