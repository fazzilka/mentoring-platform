import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select
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


async def lock_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(select(User).where(User.id == user_id).with_for_update())


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


async def slot_has_history(db: AsyncSession, slot_id: uuid.UUID) -> bool:
    return (
        await db.scalar(select(Meeting.id).where(Meeting.slot_id == slot_id).limit(1)) is not None
    )


async def reflection(db: AsyncSession, reflection_id: uuid.UUID) -> MeetingReflection | None:
    return await db.get(MeetingReflection, reflection_id, with_for_update=True)


async def notification(db: AsyncSession, notification_id: uuid.UUID) -> Notification | None:
    return await db.get(Notification, notification_id, with_for_update=True)
