import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.common import Timestamps, UUIDPrimaryKey


class Meeting(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'completed', 'cancelled')", name="ck_meeting_status"
        ),
        Index(
            "uq_open_meeting_slot",
            "slot_id",
            unique=True,
            postgresql_where=text("status IN ('pending', 'confirmed')"),
        ),
    )

    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mentor_assignments.id"))
    slot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("availability_slots.id"), index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    mentor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int]
    status: Mapped[str] = mapped_column(String(20), default="pending")
    meeting_url: Mapped[str | None] = mapped_column(String(2048))
    cancellation_reason: Mapped[str | None] = mapped_column(String(160))
