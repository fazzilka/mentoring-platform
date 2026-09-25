import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.common import Timestamps, UUIDPrimaryKey


class AvailabilitySlot(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "availability_slots"
    __table_args__ = (
        CheckConstraint("duration_minutes IN (60, 75, 90)", name="ck_slot_duration"),
        CheckConstraint("status IN ('free', 'pending', 'booked')", name="ck_slot_status"),
        Index("ix_mentor_slot_start", "mentor_id", "starts_at"),
    )

    mentor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int]
    status: Mapped[str] = mapped_column(String(20), default="free")
