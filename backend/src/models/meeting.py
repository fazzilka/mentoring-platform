import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, select, text
from sqlalchemy.orm import Mapped, column_property, mapped_column, synonym

from src.core.database import Base
from src.models.common import Timestamps, UUIDPrimaryKey
from src.models.user import User


class Meeting(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("duration_minutes IN (60, 75, 90)", name="ck_meeting_duration"),
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
    student_name: Mapped[str] = column_property(
        select(User.name).where(User.id == student_id).scalar_subquery()
    )
    mentor_name: Mapped[str] = column_property(
        select(User.name).where(User.id == mentor_id).scalar_subquery()
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int]
    status: Mapped[str] = mapped_column(String(20), default="pending")
    meeting_url: Mapped[str | None] = mapped_column(String(2048))
    cancellation_reason: Mapped[str | None] = mapped_column(String(160))
    cancelled_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    availability_slot_id = synonym("slot_id")
