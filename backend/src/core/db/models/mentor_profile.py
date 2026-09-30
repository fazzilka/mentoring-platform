import uuid

from sqlalchemy import JSON, Boolean, CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db.db import Base
from src.core.db.models.common import Timestamps, UUIDPrimaryKey


class MentorProfile(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "mentor_profiles"
    __table_args__ = (
        CheckConstraint(
            "specialization IN ('Backend', 'Frontend', 'ML', 'DevOps')",
            name="ck_mentor_specialization",
        ),
        CheckConstraint("status IN ('active', 'inactive', 'departed')", name="ck_mentor_status"),
        CheckConstraint("experience_years >= 0", name="ck_mentor_experience_years"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    about: Mapped[str] = mapped_column(Text, default="")
    specialization: Mapped[str] = mapped_column(String(30), default="Backend")
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    experience: Mapped[str] = mapped_column(Text, default="")
    experience_years: Mapped[int] = mapped_column(default=0, server_default="0")
    company: Mapped[str] = mapped_column(String(160), default="")
    position: Mapped[str] = mapped_column(String(160), default="")
    timezone: Mapped[str] = mapped_column(String(100), default="Europe/Moscow")
    default_meeting_url: Mapped[str | None] = mapped_column(String(2048))
    accepting_students: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
