from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import DbSession
from app.core.config import get_settings
from app.db.models.generation import Generation
from app.schemas.generation import (
    RATIO_DIMENSIONS,
    GenerationCreate,
    GenerationList,
    GenerationRead,
)
from app.services.generation_service import process_generation
from app.services.image_models import (
    image_model_configured,
    resolve_image_model,
)

router = APIRouter(prefix="/generations", tags=["generations"])
settings = get_settings()


@router.post("", response_model=GenerationRead, status_code=status.HTTP_202_ACCEPTED)
async def create_generation(
    payload: GenerationCreate,
    background_tasks: BackgroundTasks,
    db: DbSession,
) -> Generation:
    selected_model = resolve_image_model(settings, payload.image_model)
    if not image_model_configured(settings, selected_model):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "GPT Image 2.5 尚未配置。"
                "请在后端设置 GPT_IMAGE_API_KEY 或 IMAGE_API_KEY 后重启服务。"
            ),
        )

    width, height = RATIO_DIMENSIONS[payload.aspect_ratio]
    generation = Generation(
        prompt=payload.prompt,
        negative_prompt=payload.negative_prompt,
        style=payload.style,
        aspect_ratio=payload.aspect_ratio,
        width=width,
        height=height,
        seed=payload.seed,
        status="pending",
        provider=selected_model.provider,
        model=selected_model.model,
        enhanced_prompt=None,
    )
    if not payload.enhance_prompt:
        generation.enhanced_prompt = payload.prompt

    db.add(generation)
    await db.commit()
    await db.refresh(generation)
    background_tasks.add_task(process_generation, generation.id)
    return generation


@router.get("", response_model=GenerationList)
async def list_generations(
    db: DbSession,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> GenerationList:
    total = await db.scalar(select(func.count()).select_from(Generation))
    rows = (
        await db.scalars(
            select(Generation)
            .order_by(Generation.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return GenerationList(
        items=[GenerationRead.model_validate(row) for row in rows],
        total=total or 0,
        limit=limit,
        offset=offset,
    )


@router.get("/{generation_id}", response_model=GenerationRead)
async def get_generation(generation_id: uuid.UUID, db: DbSession) -> Generation:
    generation = await db.get(Generation, generation_id)
    if generation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="生成记录不存在")
    return generation


@router.delete("/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generation(generation_id: uuid.UUID, db: DbSession) -> None:
    generation = await db.get(Generation, generation_id)
    if generation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="生成记录不存在")
    if generation.status in {"pending", "processing"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="图片仍在生成中，暂时不能删除",
        )

    image_path = generation.image_path
    await db.delete(generation)
    await db.commit()

    if image_path:
        path = Path(image_path)
        try:
            if path.is_file():
                path.unlink()
        except OSError:
            # A stale image file must not prevent deletion of its database record.
            pass
