from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import DbSession, UserId
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
from app.services.reference_service import (
    ReferenceImageError,
    reference_paths_from_urls,
    remove_reference_files,
    save_reference_images,
)

router = APIRouter(prefix="/generations", tags=["generations"])
settings = get_settings()


@router.post("", response_model=GenerationRead, status_code=status.HTTP_202_ACCEPTED)
async def create_generation(
    payload: GenerationCreate,
    background_tasks: BackgroundTasks,
    db: DbSession,
    user_id: UserId,
) -> Generation:
    selected_model = resolve_image_model(settings, payload.image_model)
    if not image_model_configured(settings, selected_model):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{selected_model.label} 尚未配置。"
                "请在后端设置 GPT_IMAGE_API_KEY 或 IMAGE_API_KEY 后重启服务。"
            ),
        )
    if payload.reference_images and not selected_model.supports_references:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{selected_model.label} 不支持参考图，请切换到图像编辑模型。",
        )

    width, height = RATIO_DIMENSIONS[payload.aspect_ratio]
    generation_id = uuid.uuid4()
    try:
        saved_references = await asyncio.to_thread(
            save_reference_images,
            payload.reference_images,
            generation_id,
            settings.media_dir,
        )
    except ReferenceImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    generation = Generation(
        id=generation_id,
        user_uuid=user_id,
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
        reference_images_json=(
            json.dumps([item.url for item in saved_references])
            if saved_references
            else None
        ),
    )
    if not payload.enhance_prompt:
        generation.enhanced_prompt = payload.prompt

    try:
        db.add(generation)
        await db.commit()
        await db.refresh(generation)
    except Exception:
        await db.rollback()
        remove_reference_files([item.path for item in saved_references])
        raise
    background_tasks.add_task(process_generation, generation.id)
    return generation


@router.get("", response_model=GenerationList)
async def list_generations(
    db: DbSession,
    user_id: UserId,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> GenerationList:
    owned = Generation.user_uuid == user_id
    total = await db.scalar(
        select(func.count()).select_from(Generation).where(owned)
    )
    rows = (
        await db.scalars(
            select(Generation)
            .where(owned)
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
async def get_generation(
    generation_id: uuid.UUID,
    db: DbSession,
    user_id: UserId,
) -> Generation:
    generation = await db.scalar(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.user_uuid == user_id,
        )
    )
    if generation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="生成记录不存在")
    return generation


@router.delete("/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generation(
    generation_id: uuid.UUID,
    db: DbSession,
    user_id: UserId,
) -> None:
    generation = await db.scalar(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.user_uuid == user_id,
        )
    )
    if generation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="生成记录不存在")
    if generation.status in {"pending", "processing"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="图片仍在生成中，暂时不能删除",
        )

    stored_paths = reference_paths_from_urls(
        generation.reference_images,
        settings.media_dir,
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
    remove_reference_files(stored_paths)
