import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db.models import (
    MentorAssignment,
)


async def active_assignment(db: AsyncSession, student_id: uuid.UUID) -> MentorAssignment | None:
    result = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.student_id == student_id, MentorAssignment.status == "active"
        )
    )
    return result.scalar_one_or_none()


async def assignments(db: AsyncSession, student_id: uuid.UUID) -> list[MentorAssignment]:
    result = await db.scalars(
        select(MentorAssignment)
        .where(MentorAssignment.student_id == student_id)
        .order_by(MentorAssignment.created_at.desc())
    )
    return list(result)


async def active_mentor_assignments(
    db: AsyncSession, mentor_id: uuid.UUID
) -> list[MentorAssignment]:
    return list(
        await db.scalars(
            select(MentorAssignment).where(
                MentorAssignment.mentor_id == mentor_id, MentorAssignment.status == "active"
            )
        )
    )
