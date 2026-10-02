import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db import repositories as dao
from src.core.db.models import (
    MeetingReflection,
    User,
)
from src.core.errors import DomainError


class ReflectionService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add_reflection(
        self, user: User, meeting_id: uuid.UUID, text: str, next_step: str | None = None
    ) -> MeetingReflection:
        meeting = await dao.meeting(self._db, meeting_id)
        if meeting is None or user.id not in (meeting.student_id, meeting.mentor_id):
            raise DomainError(404, "Встреча не найдена")
        if meeting.status != "completed":
            raise DomainError(409, "Рефлексию можно оставить после встречи")
        role = "student" if user.id == meeting.student_id else "mentor"
        existing = await dao.meeting_reflections(self._db, meeting_id)
        if any(item.author_user_id == user.id for item in existing):
            raise DomainError(409, "Рефлексия уже сохранена")
        reflection = MeetingReflection(
            meeting_id=meeting_id,
            author_user_id=user.id,
            author_role=role,
            text=text.strip(),
            next_step=next_step,
        )
        self._db.add(reflection)
        try:
            await self._db.commit()
        except IntegrityError as exc:
            await self._db.rollback()
            raise DomainError(409, "Рефлексия уже сохранена") from exc
        await self._db.refresh(reflection)
        return reflection

    async def reflections(self, user: User, meeting_id: uuid.UUID) -> list[MeetingReflection]:
        meeting = await dao.meeting(self._db, meeting_id)
        if meeting is None or user.id not in (meeting.student_id, meeting.mentor_id):
            raise DomainError(404, "Встреча не найдена")
        items = await dao.meeting_reflections(self._db, meeting_id)
        if user.id == meeting.student_id:
            return [item for item in items if item.author_user_id == user.id]
        return items

    async def edit_reflection(
        self, user: User, reflection_id: uuid.UUID, summary: str, next_step: str | None
    ) -> MeetingReflection:
        reflection = await dao.reflection(self._db, reflection_id)
        if reflection is None:
            raise DomainError(404, "Рефлексия не найдена")
        if reflection.author_user_id != user.id:
            raise DomainError(403, "Редактировать можно только свою рефлексию")
        reflection.text = summary
        reflection.next_step = next_step
        await self._db.commit()
        await self._db.refresh(reflection)
        return reflection
