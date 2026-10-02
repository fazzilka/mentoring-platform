from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db.db import Base
from src.core.db.models.common import Timestamps, UUIDPrimaryKey


class User(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(160))
    first_name: Mapped[str] = mapped_column(String(100), default="", server_default="")
    last_name: Mapped[str] = mapped_column(String(100), default="", server_default="")
    timezone: Mapped[str] = mapped_column(
        String(100), default="Europe/Moscow", server_default="Europe/Moscow"
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    telegram_username: Mapped[str | None] = mapped_column(String(32))
    phone_number: Mapped[str | None] = mapped_column(String(16))
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
