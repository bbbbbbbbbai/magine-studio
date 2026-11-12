import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def require_user_id(
    x_user_id: Annotated[uuid.UUID, Header(alias="X-User-ID")],
    db: DbSession,
) -> uuid.UUID:
    user = await db.get(User, x_user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户身份未初始化，请保存并恢复你的 UUID。",
        )
    return user.id


UserId = Annotated[uuid.UUID, Depends(require_user_id)]
