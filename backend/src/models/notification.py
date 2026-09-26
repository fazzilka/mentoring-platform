import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, synonym

from src.core.database import Base
from src.models.common import Timestamps, UUIDPrimaryKey


class Notification(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("deduplication_key", name="uq_notification_deduplication"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    deduplication_key: Mapped[str | None] = mapped_column(String(200))
    meeting_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("meetings.id"))
    type: Mapped[str] = mapped_column(String(50), default="system", server_default="system")
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    message = synonym("body")
