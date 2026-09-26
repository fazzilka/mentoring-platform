import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import DomainError
from src.dao import domain as dao
from src.models import (
    MentorAssignment,
    Notification,
    User,
)
from src.services.access import require_role


class MentorAssignmentService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def assign_mentor(self, student: User, mentor_id: uuid.UUID) -> MentorAssignment:
        await require_role(self._db, student.id, "student")
        await dao.lock_user(self._db, student.id)
        if student.id == mentor_id:
            raise DomainError(400, "Нельзя выбрать самого себя")
        mentor = await dao.mentor_profile(self._db, mentor_id, lock=True)
        if mentor is None:
            raise DomainError(404, "Наставник не найден")
        if mentor.status != "active" or not mentor.accepting_students:
            raise DomainError(409, "Наставник недоступен")
        if await dao.active_assignment(self._db, student.id):
            raise DomainError(409, "У вас уже есть активный наставник")
        assignment = MentorAssignment(student_id=student.id, mentor_id=mentor_id, status="active")
        self._db.add(assignment)
        try:
            await self._db.commit()
        except IntegrityError as exc:
            await self._db.rollback()
            raise DomainError(409, "У вас уже есть активный наставник") from exc
        await self._db.refresh(assignment)
        return assignment

    async def depart_mentor(self, mentor: User) -> None:
        await require_role(self._db, mentor.id, "mentor")
        profile = await dao.mentor_profile(self._db, mentor.id, lock=True)
        if profile is None:
            raise DomainError(404, "Профиль наставника не найден")
        profile.status = "departed"
        profile.accepting_students = False
        now = datetime.now(UTC)
        assignments = await dao.active_mentor_assignments(self._db, mentor.id)
        for assignment in assignments:
            assignment.status = "ended"
            assignment.ended_at = now
            assignment.end_reason = "mentor_departed"
            self._db.add(
                Notification(
                    user_id=assignment.student_id,
                    title="Наставник завершил работу",
                    body="Ваш ментор больше не ведёт учеников. Вы можете выбрать нового.",
                )
            )
        open_meetings = await dao.open_mentor_meetings(self._db, mentor.id)
        for meeting in open_meetings:
            meeting.status = "cancelled"
            meeting.cancelled_by = mentor.id
            meeting.cancellation_reason = "mentor_departed"
            slot = await dao.slot(self._db, meeting.slot_id, lock=True)
            if slot and slot.starts_at > now:
                slot.status = "free"
        await self._db.commit()

    async def assignments(self, user: User) -> list[MentorAssignment]:
        await require_role(self._db, user.id, "student")
        return await dao.assignments(self._db, user.id)
