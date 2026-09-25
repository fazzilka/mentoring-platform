import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.dao import auth as auth_dao
from src.dao import domain as dao
from src.models import (
    AvailabilitySlot,
    Meeting,
    MeetingReflection,
    MentorAssignment,
    Notification,
    User,
)
from src.schemas.domain import MentorProfileUpdate, SlotCreate, StudentProfileUpdate


async def require_role(db: AsyncSession, user_id: uuid.UUID, role: str) -> None:
    if role not in await auth_dao.get_roles(db, user_id):
        raise HTTPException(403, f"Необходима роль {role}")


async def update_student_profile(
    db: AsyncSession, user: User, data: StudentProfileUpdate
) -> object:
    await require_role(db, user.id, "student")
    profile = await dao.student_profile(db, user.id)
    if profile is None:
        raise HTTPException(404, "Профиль ученика не найден")
    for key, value in data.model_dump().items():
        setattr(profile, key, value)
    await db.commit()
    return profile


async def update_mentor_profile(db: AsyncSession, user: User, data: MentorProfileUpdate) -> object:
    await require_role(db, user.id, "mentor")
    profile = await dao.mentor_profile(db, user.id)
    if profile is None:
        raise HTTPException(404, "Профиль наставника не найден")
    for key, value in data.model_dump().items():
        setattr(profile, key, value)
    await db.commit()
    return profile


async def assign_mentor(db: AsyncSession, student: User, mentor_id: uuid.UUID) -> MentorAssignment:
    await require_role(db, student.id, "student")
    await db.execute(select(User).where(User.id == student.id).with_for_update())
    if student.id == mentor_id:
        raise HTTPException(400, "Нельзя выбрать самого себя")
    mentor = await dao.mentor_profile(db, mentor_id, lock=True)
    if mentor is None or mentor.status != "active" or not mentor.accepting_students:
        raise HTTPException(404, "Наставник недоступен")
    if await dao.active_assignment(db, student.id):
        raise HTTPException(409, "У вас уже есть активный наставник")
    assignment = MentorAssignment(student_id=student.id, mentor_id=mentor_id, status="active")
    db.add(assignment)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "У вас уже есть активный наставник") from exc
    await db.refresh(assignment)
    return assignment


async def depart_mentor(db: AsyncSession, mentor: User) -> None:
    await require_role(db, mentor.id, "mentor")
    profile = await dao.mentor_profile(db, mentor.id, lock=True)
    if profile is None:
        raise HTTPException(404, "Профиль наставника не найден")
    profile.status = "departed"
    profile.accepting_students = False
    now = datetime.now(UTC)
    assignments = list(
        await db.scalars(
            select(MentorAssignment).where(
                MentorAssignment.mentor_id == mentor.id, MentorAssignment.status == "active"
            )
        )
    )
    for assignment in assignments:
        assignment.status = "ended"
        assignment.ended_at = now
        assignment.end_reason = "mentor_departed"
        db.add(
            Notification(
                user_id=assignment.student_id,
                title="Наставник завершил работу",
                body="Ваш ментор больше не ведёт учеников. Вы можете выбрать нового.",
            )
        )
    open_meetings = list(
        await db.scalars(
            select(Meeting).where(
                Meeting.mentor_id == mentor.id, Meeting.status.in_(["pending", "confirmed"])
            )
        )
    )
    for meeting in open_meetings:
        meeting.status = "cancelled"
        meeting.cancellation_reason = "mentor_departed"
    await db.commit()


async def add_slot(db: AsyncSession, mentor: User, data: SlotCreate) -> AvailabilitySlot:
    await require_role(db, mentor.id, "mentor")
    await db.execute(select(User).where(User.id == mentor.id).with_for_update())
    profile = await dao.mentor_profile(db, mentor.id, lock=True)
    if profile is None or profile.status != "active":
        raise HTTPException(409, "Наставник неактивен")
    if data.starts_at.tzinfo is None or data.starts_at <= datetime.now(UTC):
        raise HTTPException(400, "Укажите будущие дату и время с timezone")
    existing = await dao.slots(db, mentor.id)
    end = data.starts_at + timedelta(minutes=data.duration_minutes)
    if any(
        item.starts_at < end
        and item.starts_at + timedelta(minutes=item.duration_minutes) > data.starts_at
        for item in existing
    ):
        raise HTTPException(409, "Время пересекается с другим слотом")
    slot = AvailabilitySlot(
        mentor_id=mentor.id,
        starts_at=data.starts_at.astimezone(UTC),
        duration_minutes=data.duration_minutes,
        status="free",
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return slot


async def delete_slot(db: AsyncSession, mentor: User, slot_id: uuid.UUID) -> None:
    await require_role(db, mentor.id, "mentor")
    slot = await dao.slot(db, slot_id, lock=True)
    if slot is None or slot.mentor_id != mentor.id:
        raise HTTPException(404, "Слот не найден")
    if slot.status != "free":
        raise HTTPException(409, "Занятый слот удалить нельзя")
    await db.delete(slot)
    await db.commit()


async def request_meeting(db: AsyncSession, student: User, slot_id: uuid.UUID) -> Meeting:
    await require_role(db, student.id, "student")
    await db.execute(select(User).where(User.id == student.id).with_for_update())
    assignment = await dao.active_assignment(db, student.id)
    if assignment is None:
        raise HTTPException(409, "Сначала выберите наставника")
    slot = await dao.slot(db, slot_id, lock=True)
    if slot is None or slot.mentor_id != assignment.mentor_id or slot.status != "free":
        raise HTTPException(409, "Слот недоступен")
    if slot.starts_at <= datetime.now(UTC):
        raise HTTPException(409, "Слот уже прошёл")
    week_start = slot.starts_at - timedelta(days=slot.starts_at.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.scalar(
        select(func.count(Meeting.id)).where(
            Meeting.student_id == student.id,
            Meeting.mentor_id == slot.mentor_id,
            Meeting.starts_at >= week_start,
            Meeting.starts_at < week_start + timedelta(days=7),
            Meeting.status.in_(["pending", "confirmed", "completed"]),
        )
    )
    if count is not None and count >= 2:
        raise HTTPException(409, "Не более двух встреч с наставником в неделю")
    slot.status = "pending"
    meeting = Meeting(
        assignment_id=assignment.id,
        slot_id=slot.id,
        student_id=student.id,
        mentor_id=slot.mentor_id,
        starts_at=slot.starts_at,
        duration_minutes=slot.duration_minutes,
        status="pending",
    )
    db.add(meeting)
    db.add(
        Notification(
            user_id=slot.mentor_id,
            title="Новая заявка на встречу",
            body=f"{student.name} запросил встречу на {slot.starts_at:%d.%m.%Y %H:%M} UTC.",
        )
    )
    await db.commit()
    await db.refresh(meeting)
    return meeting


async def change_meeting(
    db: AsyncSession, user: User, meeting_id: uuid.UUID, action: str
) -> Meeting:
    meeting = await dao.meeting(db, meeting_id, lock=True)
    if meeting is None or user.id not in (meeting.student_id, meeting.mentor_id):
        raise HTTPException(404, "Встреча не найдена")
    slot = await dao.slot(db, meeting.slot_id, lock=True)
    if slot is None:
        raise HTTPException(409, "Слот встречи не найден")
    if action in ("confirm", "reject", "complete") and user.id != meeting.mentor_id:
        raise HTTPException(403, "Действие доступно только наставнику")
    if action == "confirm":
        if meeting.status != "pending":
            raise HTTPException(409, "Заявка уже обработана")
        profile = await dao.mentor_profile(db, meeting.mentor_id)
        if profile is None or not profile.default_meeting_url:
            raise HTTPException(409, "Укажите ссылку на Телемост в профиле")
        meeting.status = "confirmed"
        meeting.meeting_url = profile.default_meeting_url
        slot.status = "booked"
    elif action == "complete":
        if meeting.status != "confirmed":
            raise HTTPException(409, "Подтверждённая встреча не найдена")
        if meeting.starts_at + timedelta(minutes=meeting.duration_minutes) > datetime.now(UTC):
            raise HTTPException(409, "Встреча ещё не завершилась")
        meeting.status = "completed"
    elif action in ("reject", "cancel"):
        if meeting.status not in ("pending", "confirmed"):
            raise HTTPException(409, "Встречу уже нельзя отменить")
        meeting.status = "cancelled"
        meeting.cancellation_reason = (
            "rejected_by_mentor" if action == "reject" else "cancelled_by_user"
        )
        slot.status = "free"
    else:
        raise HTTPException(400, "Неизвестное действие")
    await db.commit()
    return meeting


async def add_reflection(
    db: AsyncSession, user: User, meeting_id: uuid.UUID, text: str
) -> MeetingReflection:
    meeting = await dao.meeting(db, meeting_id)
    if meeting is None or user.id not in (meeting.student_id, meeting.mentor_id):
        raise HTTPException(404, "Встреча не найдена")
    if meeting.status != "completed":
        raise HTTPException(409, "Рефлексию можно оставить после встречи")
    role = "student" if user.id == meeting.student_id else "mentor"
    existing = await dao.meeting_reflections(db, meeting_id)
    if any(item.author_role == role for item in existing):
        raise HTTPException(409, "Рефлексия уже сохранена")
    reflection = MeetingReflection(
        meeting_id=meeting_id, author_user_id=user.id, author_role=role, text=text.strip()
    )
    db.add(reflection)
    await db.commit()
    await db.refresh(reflection)
    return reflection
