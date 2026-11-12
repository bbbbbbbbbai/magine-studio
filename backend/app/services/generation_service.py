from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select

from app.core.config import get_settings
from app.db.models.generation import Generation
from app.db.session import AsyncSessionLocal
from app.services.image_service import ImageGenerator
from app.services.llm_service import PromptEnhancer
from app.services.reference_service import resolve_reference_paths

logger = logging.getLogger(__name__)
settings = get_settings()


def _media_directory() -> Path:
    target = settings.media_dir / "generations"
    target.mkdir(parents=True, exist_ok=True)
    return target


async def process_generation(generation_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        generation = await db.scalar(
            select(Generation).where(Generation.id == generation_id)
        )
        if generation is None:
            return

        image_provider = generation.provider
        image_model = generation.model

        try:
            generation.status = "processing"
            await db.commit()

            effective_prompt = generation.prompt
            if generation.enhanced_prompt:
                effective_prompt = generation.enhanced_prompt
            elif generation.enhanced_prompt is None:
                effective_prompt = await PromptEnhancer(settings).enhance(
                    generation.prompt, generation.style, generation.aspect_ratio
                )
                generation.enhanced_prompt = effective_prompt
                await db.commit()
                # A committed ORM instance is expired before the next access.
                effective_prompt = generation.enhanced_prompt or generation.prompt

            image = await ImageGenerator(
                settings,
                provider=image_provider,
                model=image_model,
            ).generate(
                prompt=effective_prompt,
                negative_prompt=generation.negative_prompt,
                width=generation.width,
                height=generation.height,
                seed=generation.seed,
                reference_images=resolve_reference_paths(
                    generation.reference_images,
                    settings.media_dir,
                ),
            )

            extension = image.extension
            filename = f"{generation.id}.{extension}"
            destination = _media_directory() / filename
            temporary = destination.with_suffix(f".tmp-{uuid.uuid4().hex}")
            await asyncio.to_thread(temporary.write_bytes, image.content)
            temporary.replace(destination)

            generation.image_path = str(destination)
            generation.image_url = f"/media/generations/{filename}"
            generation.status = "completed"
            generation.error_message = None
            generation.completed_at = datetime.now(UTC)
            await db.commit()
        except Exception as exc:
            logger.exception("Generation %s failed", generation_id)
            await db.rollback()
            async with AsyncSessionLocal() as failure_db:
                failed = await failure_db.get(Generation, generation_id)
                if failed is not None:
                    failed.status = "failed"
                    failed.error_message = str(exc)[:1000]
                    failed.completed_at = datetime.now(UTC)
                    await failure_db.commit()
