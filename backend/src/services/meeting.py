import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import DomainError
from src.dao import domain as dao
from src.models import (
    Meeting,
    Notification,
    User,
)
from src.services.access import require_role


class MeetingService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def request_meeting(self, student: User, slot_id: uuid.UUID) -> Meeting:
        await require_role(self._db, student.id, "student")
        await dao.lock_user(self._db, student.id)
        assignment = await dao.active_assignment(self._db, student.id)
        if assignment is None:
            raise DomainError(409, "Сначала выберите наставника")
        profile = await dao.mentor_profile(self._db, assignment.mentor_id, lock=True)
        if profile is None or profile.status != "active":
            raise DomainError(409, "Наставник неактивен")
        slot = await dao.slot(self._db, slot_id, lock=True)
        if slot is None:
            raise DomainError(404, "Слот не найден")
        if slot.mentor_id != assignment.mentor_id:
            raise DomainError(403, "Записаться можно только к своему наставнику")
        if slot.status != "free":
            raise DomainError(409, "Слот недоступен")
        if slot.starts_at <= datetime.now(UTC):
            raise DomainError(409, "Слот уже прошёл")
        week_start = slot.starts_at - timedelta(days=slot.starts_at.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        count = await dao.weekly_meeting_count(self._db, student.id, slot.mentor_id, week_start)
        if count >= 2:
            raise DomainError(409, "Не более двух встреч с наставником в неделю")
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
        self._db.add(meeting)
        await self._db.flush()
        self._db.add(
            Notification(
                user_id=slot.mentor_id,
                meeting_id=meeting.id,
                type="meeting_requested",
                title="Новая заявка на встречу",
                body=f"{student.name} запросил встречу на {slot.starts_at:%d.%m.%Y %H:%M} UTC.",
            )
        )
        await self._db.commit()
        await self._db.refresh(meeting)
        return meeting

    async def change_meeting(
        self, user: User, meeting_id: uuid.UUID, action: str, reason: str | None = None
    ) -> Meeting:
        meeting = await dao.meeting(self._db, meeting_id, lock=True)
        if meeting is None or user.id not in (meeting.student_id, meeting.mentor_id):
            raise DomainError(404, "Встреча не найдена")
        slot = await dao.slot(self._db, meeting.slot_id, lock=True)
        if slot is None:
            raise DomainError(409, "Слот встречи не найден")
        if action in ("confirm", "reject", "complete") and user.id != meeting.mentor_id:
            raise DomainError(403, "Действие доступно только наставнику")
        if action == "confirm":
            if meeting.status != "pending":
                raise DomainError(409, "Заявка уже обработана")
            if meeting.starts_at <= datetime.now(UTC):
                raise DomainError(409, "Время встречи уже прошло")
            profile = await dao.mentor_profile(self._db, meeting.mentor_id)
            if profile is None or not profile.default_meeting_url:
                raise DomainError(409, "Укажите ссылку на Телемост в профиле")
            meeting.status = "confirmed"
            meeting.meeting_url = profile.default_meeting_url
            slot.status = "booked"
        elif action == "complete":
            if meeting.status != "confirmed":
                raise DomainError(409, "Подтверждённая встреча не найдена")
            if meeting.starts_at + timedelta(minutes=meeting.duration_minutes) > datetime.now(UTC):
                raise DomainError(409, "Встреча ещё не завершилась")
            meeting.status = "completed"
        elif action in ("reject", "cancel"):
            if meeting.status not in ("pending", "confirmed"):
                raise DomainError(409, "Встречу уже нельзя отменить")
            if action == "reject" and meeting.status != "pending":
                raise DomainError(409, "Отклонить можно только pending-заявку")
            meeting.status = "cancelled"
            meeting.cancelled_by = user.id
            meeting.cancellation_reason = reason or (
                "rejected_by_mentor" if action == "reject" else "cancelled_by_user"
            )
            if slot.starts_at > datetime.now(UTC):
                slot.status = "free"
        else:
            raise DomainError(400, "Неизвестное действие")
        self._db.add(
            Notification(
                user_id=meeting.student_id if user.id == meeting.mentor_id else meeting.mentor_id,
                meeting_id=meeting.id,
                type=f"meeting_{meeting.status}",
                title="Статус встречи изменён",
                body=f"Статус встречи: {meeting.status}.",
            )
        )
        await self._db.commit()
        await self._db.refresh(meeting)
        return meeting

    async def meetings(self, user: User) -> list[Meeting]:
        return await dao.meetings(self._db, user.id)

    async def meeting(self, user: User, meeting_id: uuid.UUID) -> Meeting:
        meeting = await dao.meeting(self._db, meeting_id)
        if meeting is None or user.id not in (meeting.student_id, meeting.mentor_id):
            raise DomainError(404, "Встреча не найдена")
        return meeting
