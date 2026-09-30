import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.access import require_role
from src.core.db import repositories as dao
from src.core.db.dto import SlotData
from src.core.db.models import (
    AvailabilitySlot,
    User,
)
from src.core.errors import DomainError


class AvailabilityService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add_slot(self, mentor: User, data: SlotData) -> AvailabilitySlot:
        await require_role(self._db, mentor.id, "mentor")
        await dao.lock_user(self._db, mentor.id)
        profile = await dao.mentor_profile(self._db, mentor.id, lock=True)
        if profile is None or profile.status != "active":
            raise DomainError(409, "Наставник неактивен")
        if data.starts_at.tzinfo is None or data.starts_at <= datetime.now(UTC):
            raise DomainError(400, "Укажите будущие дату и время с timezone")
        existing = await dao.slots(self._db, mentor.id)
        end = data.starts_at + timedelta(minutes=data.duration_minutes)
        if any(
            item.starts_at < end
            and item.starts_at + timedelta(minutes=item.duration_minutes) > data.starts_at
            for item in existing
        ):
            raise DomainError(409, "Время пересекается с другим слотом")
        slot = AvailabilitySlot(
            mentor_id=mentor.id,
            starts_at=data.starts_at.astimezone(UTC),
            duration_minutes=data.duration_minutes,
            status="free",
        )
        self._db.add(slot)
        await self._db.commit()
        await self._db.refresh(slot)
        return slot

    async def delete_slot(self, mentor: User, slot_id: uuid.UUID) -> None:
        await require_role(self._db, mentor.id, "mentor")
        slot = await dao.slot(self._db, slot_id, lock=True)
        if slot is None or slot.mentor_id != mentor.id:
            raise DomainError(404, "Слот не найден")
        if slot.status != "free":
            raise DomainError(409, "Занятый слот удалить нельзя")
        if await dao.slot_has_history(self._db, slot.id):
            raise DomainError(409, "Слот связан с историей встреч и не может быть удалён")
        await self._db.delete(slot)
        await self._db.commit()

    async def slots(self, user: User, mentor_id: uuid.UUID) -> list[AvailabilitySlot]:
        profile = await dao.mentor_profile(self._db, mentor_id)
        if profile is None:
            raise DomainError(404, "Наставник не найден")
        if user.id != mentor_id:
            await require_role(self._db, user.id, "student")
        else:
            await require_role(self._db, user.id, "mentor")
        return await dao.slots(self._db, mentor_id)

    async def update_slot(self, user: User, slot_id: uuid.UUID, data: SlotData) -> AvailabilitySlot:
        await require_role(self._db, user.id, "mentor")
        await dao.lock_user(self._db, user.id)
        profile = await dao.mentor_profile(self._db, user.id, lock=True)
        if profile is None or profile.status != "active":
            raise DomainError(409, "Наставник неактивен")
        slot = await dao.slot(self._db, slot_id, lock=True)
        if slot is None or slot.mentor_id != user.id:
            raise DomainError(404, "Слот не найден")
        if slot.status != "free":
            raise DomainError(409, "Изменить можно только свободный слот")
        if data.starts_at <= datetime.now(UTC):
            raise DomainError(400, "Укажите будущие дату и время")
        if await dao.slot_has_history(self._db, slot.id):
            raise DomainError(409, "Слот связан с историей встреч")
        end = data.starts_at + timedelta(minutes=data.duration_minutes)
        if any(
            item.id != slot.id
            and item.starts_at < end
            and item.starts_at + timedelta(minutes=item.duration_minutes) > data.starts_at
            for item in await dao.slots(self._db, user.id)
        ):
            raise DomainError(409, "Время пересекается с другим слотом")
        slot.starts_at = data.starts_at
        slot.duration_minutes = data.duration_minutes
        await self._db.commit()
        await self._db.refresh(slot)
        return slot
