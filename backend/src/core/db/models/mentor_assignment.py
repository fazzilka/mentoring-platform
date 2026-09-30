import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db.db import Base
from src.core.db.models.common import Timestamps, UUIDPrimaryKey


class MentorAssignment(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "mentor_assignments"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'ended')", name="ck_assignment_status"),
        Index(
            "uq_active_student_assignment",
            "student_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    mentor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_reason: Mapped[str | None] = mapped_column(String(100))
