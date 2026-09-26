from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.development import development_current_user
from src.core.database import get_session
from src.core.security import decode_access_token
from src.dao import auth as auth_dao
from src.models import AuthSession, User

DbSession = Annotated[AsyncSession, Depends(get_session)]
bearer = HTTPBearer(auto_error=False)


async def current_user_and_session(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> tuple[User, AuthSession]:
    if credentials is None:
        raise HTTPException(401, "Требуется авторизация")
    try:
        user_id, session_id = decode_access_token(credentials.credentials)
    except (jwt.InvalidTokenError, ValueError, KeyError) as exc:
        raise HTTPException(401, "Недействительный access token") from exc
    auth_session = await auth_dao.get_session(db, session_id)
    if not auth_session or auth_session.user_id != user_id or auth_session.revoked_at:
        raise HTTPException(401, "Сессия завершена")
    user = await auth_dao.get_user(db, user_id)
    if not user:
        raise HTTPException(401, "Пользователь не найден")
    return user, auth_session


async def current_user(
    identity: Annotated[tuple[User, AuthSession], Depends(current_user_and_session)],
) -> User:
    return identity[0]


CurrentUserDep = Annotated[User, Depends(development_current_user)]
