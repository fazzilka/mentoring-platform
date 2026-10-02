import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db.models import (
    AvailabilitySlot,
    Meeting,
)


async def slot(
    db: AsyncSession, slot_id: uuid.UUID, *, lock: bool = False
) -> AvailabilitySlot | None:
    statement = select(AvailabilitySlot).where(AvailabilitySlot.id == slot_id)
    if lock:
        statement = statement.with_for_update()
    result = await db.execute(statement)
    return result.scalar_one_or_none()


async def slots(db: AsyncSession, mentor_id: uuid.UUID) -> list[AvailabilitySlot]:
    result = await db.scalars(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.mentor_id == mentor_id)
        .order_by(AvailabilitySlot.starts_at)
    )
    return list(result)


async def slot_has_history(db: AsyncSession, slot_id: uuid.UUID) -> bool:
    return (
        await db.scalar(select(Meeting.id).where(Meeting.slot_id == slot_id).limit(1)) is not None
    )
