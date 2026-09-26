from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import get_settings
from src.core.security import hash_token
from src.models import TelegramConnection
from src.services.telegram import connect_from_start, create_deep_link

from tests.test_platform import person


@pytest.mark.asyncio
async def test_telegram_link_is_short_lived_and_one_time(
    db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_username", "mentoring_test_bot")
    monkeypatch.setattr(settings, "telegram_bot_token", "test-only-token")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "test-only-webhook")
    user = await person(db, "student")
    link = await create_deep_link(db, user)
    token = link.split("?start=", 1)[1]
    assert len(token) <= 64
    assert await connect_from_start(db, token, "12345") == user.id
    assert await connect_from_start(db, token, "99999") is None
    assert await connect_from_start(db, "unknown", "99999") is None
    link = await create_deep_link(db, user)
    token = link.split("?start=", 1)[1]
    from sqlalchemy import select

    connection = await db.scalar(
        select(TelegramConnection).where(TelegramConnection.user_id == user.id)
    )
    assert connection and connection.link_token_hash == hash_token(token)
    connection.link_expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()
    assert await connect_from_start(db, token, "99999") is None
