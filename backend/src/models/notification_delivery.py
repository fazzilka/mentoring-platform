import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.common import Timestamps, UUIDPrimaryKey


class NotificationDelivery(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "notification_deliveries"
    __table_args__ = (
        CheckConstraint("channel IN ('email', 'telegram')", name="ck_delivery_channel"),
        CheckConstraint("minutes_before IN (60, 5)", name="ck_delivery_offset"),
        CheckConstraint("status IN ('claimed', 'sent', 'failed')", name="ck_delivery_status"),
        UniqueConstraint(
            "meeting_id", "recipient_id", "channel", "minutes_before", name="uq_reminder_delivery"
        ),
    )

    meeting_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("meetings.id"))
    recipient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    channel: Mapped[str] = mapped_column(String(20))
    minutes_before: Mapped[int]
    status: Mapped[str] = mapped_column(String(20), default="claimed")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
