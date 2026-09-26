import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.security import hash_token, new_refresh_token
from src.models import TelegramConnection, User


async def create_deep_link(db: AsyncSession, user: User) -> str:
    username = get_settings().telegram_bot_username
    if not username:
        raise HTTPException(503, "Telegram Bot не настроен")
    token = new_refresh_token()
    connection = await db.scalar(
        select(TelegramConnection).where(TelegramConnection.user_id == user.id)
    )
    if connection is None:
        connection = TelegramConnection(user_id=user.id)
        db.add(connection)
    connection.link_token_hash = hash_token(token)
    connection.link_expires_at = datetime.now(UTC) + timedelta(minutes=15)
    await db.commit()
    return f"https://t.me/{username}?start={token}"


async def connect_from_start(db: AsyncSession, token: str, chat_id: str) -> uuid.UUID | None:
    connection = await db.scalar(
        select(TelegramConnection)
        .where(TelegramConnection.link_token_hash == hash_token(token))
        .with_for_update()
    )
    if connection is None or not connection.link_expires_at:
        return None
    if connection.link_expires_at <= datetime.now(UTC):
        return None
    connection.chat_id = chat_id
    connection.link_token_hash = None
    connection.link_expires_at = None
    await db.commit()
    return connection.user_id
