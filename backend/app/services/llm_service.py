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
        "cinematic": "cinematic photography, dramatic natural light, detailed textures",
        "photography": "editorial photography, realistic detail, natural color grading",
        "illustration": "refined digital illustration, expressive shapes, rich color",
        "3d": "high-end 3D render, tactile materials, soft studio lighting",
        "watercolor": "delicate watercolor painting, layered pigment, textured paper",
        "graphic": "minimal graphic design, bold composition, clean negative space",
    }
    visual_style = style_map.get(style, f"{style} visual style")
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
