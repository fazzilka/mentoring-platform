import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import DomainError
from src.dao import domain as dao
from src.models import Notification, User


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def notifications(self, user: User) -> list[Notification]:
        return await dao.notifications(self._db, user.id)

    async def read(self, user: User, notification_id: uuid.UUID) -> Notification:
        notification = await dao.notification(self._db, notification_id)
        if notification is None or notification.user_id != user.id:
            raise DomainError(404, "Уведомление не найдено")
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
            notification.is_read = True
        await self._db.commit()
        await self._db.refresh(notification)
        return notification

    async def read_all(self, user: User) -> None:
        for notification in await dao.notifications(self._db, user.id):
            if notification.read_at is None:
                notification.read_at = datetime.now(UTC)
                notification.is_read = True
        await self._db.commit()
