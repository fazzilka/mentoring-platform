from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.api.v1.schemas import OrmResponse
from src.core.validation import validate_meeting_url


class StudentProfileCreate(BaseModel):
    about: str = Field(default="", max_length=3000)
    level: str = Field(default="", max_length=100)
    direction: str = Field(default="", max_length=100)
    goal: str = Field(default="", max_length=3000)
    technologies: list[str] = Field(default_factory=list, max_length=50)
    learning_interests: str = Field(default="", max_length=3000)


class StudentProfileUpdate(StudentProfileCreate):
    pass


class StudentProfileResponse(StudentProfileCreate, OrmResponse):
    user_id: UUID
    email: str | None = None
    telegram_username: str | None = None
    phone_number: str | None = None


class MentorProfileCreate(BaseModel):
    about: str = Field(default="", max_length=3000)
    specialization: Literal["Backend", "Frontend", "ML", "DevOps"] = "Backend"
    skills: list[str] = Field(default_factory=list, max_length=50)
    experience_years: int = Field(default=0, ge=0, le=100)
    company: str = Field(default="", max_length=160)
    position: str = Field(default="", max_length=160)
    default_meeting_url: str | None = Field(default=None, max_length=2048)
    accepting_students: bool = True
    status: Literal["active", "inactive", "departed"] = "active"

    @field_validator("default_meeting_url")
    @classmethod
    def validate_default_meeting_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_meeting_url(value)


class MentorProfileUpdate(MentorProfileCreate):
    pass


class MentorProfileResponse(MentorProfileCreate, OrmResponse):
    user_id: UUID
    name: str = ""
    avatar_url: str | None = None
    timezone: str
    email: str | None = None
    telegram_username: str | None = None
    phone_number: str | None = None
