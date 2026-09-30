import uuid

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, synonym

from src.core.db.db import Base
from src.core.db.models.common import Timestamps, UUIDPrimaryKey


class StudentProfile(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "student_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    about: Mapped[str] = mapped_column(Text, default="")
    current_level: Mapped[str] = mapped_column(String(100), default="")
    direction: Mapped[str] = mapped_column(String(100), default="")
    learning_goal: Mapped[str] = mapped_column(Text, default="")
    technologies: Mapped[list[str]] = mapped_column(JSON, default=list)
    wants_to_learn: Mapped[str] = mapped_column(Text, default="")
    timezone: Mapped[str] = mapped_column(String(100), default="Europe/Moscow")
    level = synonym("current_level")
    goal = synonym("learning_goal")
    learning_interests = synonym("wants_to_learn")
