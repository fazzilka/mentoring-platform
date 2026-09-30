import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, synonym

from src.core.db.db import Base
from src.core.db.models.common import Timestamps, UUIDPrimaryKey


class MeetingReflection(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "meeting_reflections"
    __table_args__ = (
        CheckConstraint("author_role IN ('student', 'mentor')", name="ck_reflection_author_role"),
        UniqueConstraint("meeting_id", "author_role", name="uq_meeting_reflection_author"),
        UniqueConstraint("meeting_id", "author_user_id", name="uq_meeting_reflection_user"),
    )

    meeting_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("meetings.id"), index=True)
    author_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    author_role: Mapped[str]
    text: Mapped[str] = mapped_column(Text)
    next_step: Mapped[str | None] = mapped_column(Text)
    author_id = synonym("author_user_id")
    summary = synonym("text")
