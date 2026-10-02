import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db.models import (
    MeetingReflection,
)


async def meeting_reflections(db: AsyncSession, meeting_id: uuid.UUID) -> list[MeetingReflection]:
    return list(
        await db.scalars(
            select(MeetingReflection).where(MeetingReflection.meeting_id == meeting_id)
        )
    )


async def reflection(db: AsyncSession, reflection_id: uuid.UUID) -> MeetingReflection | None:
    return await db.get(MeetingReflection, reflection_id, with_for_update=True)
