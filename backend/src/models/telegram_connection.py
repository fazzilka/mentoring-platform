import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.common import Timestamps, UUIDPrimaryKey


class TelegramConnection(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "telegram_connections"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    chat_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    link_token_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    link_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
