from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.api.deps import DbSession, UserId
from app.core.config import get_settings
from app.db.models.user import User
from app.schemas.user import UserInitialize, UserRead

router = APIRouter(prefix="/users", tags=["users"])
settings = get_settings()


@router.post("/initialize", response_model=UserRead)
async def initialize_user(payload: UserInitialize, db: DbSession) -> User:
    configured_root = settings.root_user_id
    if configured_root is not None and configured_root == payload.id:
        await db.execute(
            update(User)
            .where(User.role == "root", User.id != payload.id)
            .values(role="guest")
        )

    user = await db.get(User, payload.id)
    if user is None:
        is_first_user = (
            await db.scalar(select(func.count()).select_from(User))
        ) == 0
        role = (
            "root"
            if configured_root == payload.id
            or (configured_root is None and is_first_user)
            else "guest"
        )
        user = User(id=payload.id, role=role)
        db.add(user)
    elif configured_root is not None:
        user.role = "root" if configured_root == payload.id else "guest"

    user.last_seen_at = datetime.now(UTC)
    try:
        await db.commit()
    except IntegrityError:
        # React development mode can issue the same initialization twice.
        await db.rollback()
        user = await db.get(User, payload.id)
        if user is None:
            user = User(id=payload.id, role="guest")
            db.add(user)
            await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserRead)
async def current_user(user_id: UserId, db: DbSession) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise RuntimeError("Authenticated user no longer exists")
    return user
