import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db.models import (
    Meeting,
)


async def meeting(db: AsyncSession, meeting_id: uuid.UUID, *, lock: bool = False) -> Meeting | None:
    statement = select(Meeting).where(Meeting.id == meeting_id)
    if lock:
        statement = statement.with_for_update()
    result = await db.execute(statement)
    return result.scalar_one_or_none()


async def meetings(db: AsyncSession, user_id: uuid.UUID) -> list[Meeting]:
    result = await db.scalars(
        select(Meeting)
        .where((Meeting.student_id == user_id) | (Meeting.mentor_id == user_id))
        .order_by(Meeting.starts_at.desc())
    )
    return list(result)


async def open_mentor_meetings(db: AsyncSession, mentor_id: uuid.UUID) -> list[Meeting]:
    return list(
        await db.scalars(
            select(Meeting)
            .where(Meeting.mentor_id == mentor_id, Meeting.status.in_(["pending", "confirmed"]))
            .with_for_update()
        )
    )


async def weekly_meeting_count(
    db: AsyncSession, student_id: uuid.UUID, mentor_id: uuid.UUID, week_start: datetime
) -> int:
    return int(
        await db.scalar(
            select(func.count(Meeting.id)).where(
                Meeting.student_id == student_id,
                Meeting.mentor_id == mentor_id,
                Meeting.starts_at >= week_start,
                Meeting.starts_at < week_start + timedelta(days=7),
                Meeting.status.in_(["pending", "confirmed", "completed"]),
            )
        )
        or 0
    )
