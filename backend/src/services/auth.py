import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from src.core.config import get_settings
from src.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)
from src.dao import auth as auth_dao
from src.models import AuthSession, User
from src.schemas.auth import RegisterRequest, TokenPair


def issue_tokens(db: AsyncSession, user: User) -> TokenPair:
    refresh_token = new_refresh_token()
    auth_session = AuthSession(
        id=uuid.uuid4(),
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=get_settings().refresh_token_days),
    )
    db.add(auth_session)
    return TokenPair(
        access_token=create_access_token(user.id, auth_session.id),
        refresh_token=refresh_token,
    )


async def register(db: AsyncSession, data: RegisterRequest) -> TokenPair:
    if await auth_dao.get_user_by_email(db, data.email.lower()):
        raise HTTPException(409, "Email уже зарегистрирован")
    user = User(
        name=data.name.strip(),
        email=data.email.lower(),
        password_hash=await run_in_threadpool(hash_password, data.password),
        first_name=data.name.strip().split()[0],
        last_name=" ".join(data.name.strip().split()[1:]),
    )
    try:
        db.add(user)
        await db.flush()
        await auth_dao.add_role(db, user.id, data.initial_role)
        tokens = issue_tokens(db, user)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "Email уже зарегистрирован") from exc
    return tokens


async def login(db: AsyncSession, email: str, password: str) -> TokenPair:
    user = await auth_dao.get_user_by_email(db, email.lower())
    if not user or not await run_in_threadpool(verify_password, password, user.password_hash):
        raise HTTPException(401, "Неверный email или пароль")
    tokens = issue_tokens(db, user)
    await db.commit()
    return tokens


async def refresh(db: AsyncSession, token: str) -> TokenPair:
    auth_session = await auth_dao.get_session_by_hash(db, hash_token(token))
    if not auth_session or auth_session.revoked_at or auth_session.expires_at <= datetime.now(UTC):
        raise HTTPException(401, "Недействительная refresh-сессия")
    user = await auth_dao.get_user(db, auth_session.user_id)
    if not user:
        raise HTTPException(401, "Пользователь не найден")
    auth_session.revoked_at = datetime.now(UTC)
    tokens = issue_tokens(db, user)
    await db.commit()
    return tokens


async def logout(db: AsyncSession, auth_session: AuthSession) -> None:
    auth_session.revoked_at = datetime.now(UTC)
    await db.commit()
