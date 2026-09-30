import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db.models import (
    MentorAssignment,
    MentorProfile,
    StudentProfile,
    User,
)


async def student_profile(db: AsyncSession, user_id: uuid.UUID) -> StudentProfile | None:
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user_id))
    return result.scalar_one_or_none()


async def mentor_profile(
    db: AsyncSession, user_id: uuid.UUID, *, lock: bool = False
) -> MentorProfile | None:
    statement = select(MentorProfile).where(MentorProfile.user_id == user_id)
    if lock:
        statement = statement.with_for_update()
    result = await db.execute(statement)
    return result.scalar_one_or_none()


async def mentor_students(db: AsyncSession, mentor_id: uuid.UUID) -> list[User]:
    result = await db.scalars(
        select(User)
        .join(MentorAssignment, MentorAssignment.student_id == User.id)
        .where(MentorAssignment.mentor_id == mentor_id, MentorAssignment.status == "active")
        .order_by(User.name)
    )
    return list(result)


async def catalog(
    db: AsyncSession, search: str | None, specialization: str | None
) -> list[tuple[MentorProfile, User]]:
    statement = (
        select(MentorProfile, User)
        .join(User, User.id == MentorProfile.user_id)
        .where(MentorProfile.status == "active", MentorProfile.accepting_students.is_(True))
    )
    if specialization:
        statement = statement.where(MentorProfile.specialization == specialization)
    if search:
        statement = statement.where(User.name.ilike(f"%{search}%"))
    return list((await db.execute(statement.order_by(User.name))).tuples().all())


async def lock_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(select(User).where(User.id == user_id).with_for_update())
