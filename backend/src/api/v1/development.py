from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_session
from src.models import User


async def development_current_user(
    db: Annotated[AsyncSession, Depends(get_session)],
    user_id: Annotated[UUID | None, Header(alias="X-Development-User-Id")] = None,
) -> User:
    """Временный выбор пользователя для локальной Lab 2, не авторизация."""
    if get_settings().environment not in {"local", "test"}:
        raise HTTPException(403, "Development dependency отключена вне local/test")
    if user_id is None:
        raise HTTPException(400, "Для Lab 2 укажите X-Development-User-Id")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Пользователь не найден")
    return user
