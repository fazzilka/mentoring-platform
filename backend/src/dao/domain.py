import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import (
    AvailabilitySlot,
    Meeting,
    MeetingReflection,
    MentorAssignment,
    MentorProfile,
    Notification,
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


async def meeting_reflections(db: AsyncSession, meeting_id: uuid.UUID) -> list[MeetingReflection]:
    return list(
        await db.scalars(
            select(MeetingReflection).where(MeetingReflection.meeting_id == meeting_id)
        )
    )


async def notifications(db: AsyncSession, user_id: uuid.UUID) -> list[Notification]:
    return list(
        await db.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
    )
