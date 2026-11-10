import pytest
from pydantic import ValidationError

from app.schemas.generation import GenerationCreate


def test_generation_input_is_trimmed() -> None:
    payload = GenerationCreate(
        prompt="  一座云上图书馆  ",
        negative_prompt="  水印  ",
        style="  cinematic ",
        aspect_ratio="16:9",
    )

    assert payload.prompt == "一座云上图书馆"
    assert payload.negative_prompt == "水印"
    assert payload.style == "cinematic"


def test_blank_negative_prompt_becomes_none() -> None:
    payload = GenerationCreate(prompt="微光中的森林", negative_prompt="   ")
    assert payload.negative_prompt is None


def test_invalid_aspect_ratio_is_rejected() -> None:
    with pytest.raises(ValidationError):
        GenerationCreate(prompt="微光中的森林", aspect_ratio="2:1")
