from __future__ import annotations

import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import Settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are an expert visual prompt editor for a text-to-image model.
Rewrite the user's idea into one vivid, concrete, production-ready English image prompt.
Preserve every important subject, relationship, language-specific text, and constraint.
Describe composition, lighting, materials, color, camera/lens when relevant, and mood.
Do not add unrelated subjects. Do not explain your work. Return only the final prompt.
If the user provides things to avoid, state them naturally as exclusions in the positive prompt."""


def _local_enhancement(prompt: str, style: str, aspect_ratio: str) -> str:
    style_map = {
        "none": (
            "follow the user's visual direction and reference image "
            "without adding a style preset"
        ),
        "realistic": (
            "realistic editorial portrait photography, natural skin texture, "
            "85mm lens, soft flattering light"
        ),
        "fashion": (
            "Korean and Japanese fashion magazine editorial, minimal studio set, "
            "polished color grading, refined styling"
        ),
        "film": (
            "35mm vintage Fujifilm portrait photography, subtle film grain, "
            "warm nostalgic color, natural street lighting"
        ),
        "semi_real": (
            "2.5D semi-realistic game character illustration, painterly light "
            "and shadow, refined facial features, detailed fabric and metal"
        ),
        "anime": (
            "refined Japanese anime illustration, clean cel shading blended with "
            "painterly highlights, transparent vivid color"
        ),
        "cel_anime": (
            "Makoto Shinkai inspired animated film still, luminous volumetric "
            "light, rich atmospheric color, detailed hair highlights"
        ),
        "manga": (
            "Japanese black-and-white manga artwork, precise G-pen ink lines, "
            "detailed screentone shading"
        ),
        "render3d": (
            "Unreal Engine 5 and Octane Render next-generation 3D character "
            "render, subsurface skin, cinematic studio lighting"
        ),
        "toy": (
            "premium painted PVC collectible figure, softbox studio lighting, "
            "precise material highlights, macro depth of field"
        ),
        "cyberpunk": (
            "cyberpunk neon visual, rainy night rim lighting, cold and warm "
            "reflections, futuristic cinematic atmosphere"
        ),
        "concept_sheet": (
            "character concept sheet, full-body character design, pure clean "
            "white background, even diffuse lighting, clear clothing construction"
        ),
    }
    visual_style = style_map.get(style, style if style != "none" else "")
    if not visual_style:
        return (
            f"{prompt}. Balanced {aspect_ratio} composition, faithful to the requested "
            "visual direction, high visual detail, no watermarks, no captions, "
            "no unintended text."
        )
    return (
        f"{prompt}. {visual_style}. Strong focal point, balanced {aspect_ratio} composition, "
        "high visual detail, no watermarks, no captions, no unintended text."
    )


class PromptEnhancer:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def enhance(self, prompt: str, style: str, aspect_ratio: str) -> str:
        if not self.settings.llm_enabled:
            return _local_enhancement(prompt, style, aspect_ratio)

        llm = ChatOpenAI(
            model=self.settings.llm_model,
            api_key=self.settings.llm_api_key,
            base_url=self.settings.llm_base_url,
            temperature=self.settings.llm_temperature,
            timeout=60,
            max_retries=1,
        )
        messages = [
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"Creative idea: {prompt}\n"
                    f"Requested style: {style}\n"
                    f"Aspect ratio: {aspect_ratio}"
                )
            ),
        ]

        try:
            response = await llm.ainvoke(messages)
            content = response.content
            if isinstance(content, list):
                content = " ".join(
                    part.get("text", "") if isinstance(part, dict) else str(part)
                    for part in content
                )
            content = re.sub(r"^```(?:\w+)?\s*|\s*```$", "", str(content).strip())
            if content:
                return content
        except Exception:
            logger.exception("LLM prompt enhancement failed; using local fallback")

        return _local_enhancement(prompt, style, aspect_ratio)
