import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db.models import (
    Notification,
)


async def notifications(db: AsyncSession, user_id: uuid.UUID) -> list[Notification]:
    return list(
        await db.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
    )


async def notification(db: AsyncSession, notification_id: uuid.UUID) -> Notification | None:
    return await db.get(Notification, notification_id, with_for_update=True)
