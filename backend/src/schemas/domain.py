from datetime import datetime
from typing import Literal
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OrmResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class StudentProfileUpdate(BaseModel):
    about: str = Field(max_length=3000)
    current_level: str = Field(max_length=100)
    direction: str = Field(max_length=100)
    learning_goal: str = Field(max_length=3000)
    technologies: list[str]
    wants_to_learn: str = Field(max_length=3000)
    timezone: str = Field(max_length=100)


class StudentProfileResponse(StudentProfileUpdate, OrmResponse):
    user_id: UUID


class MentorProfileUpdate(BaseModel):
    about: str = Field(max_length=3000)
    specialization: Literal["Backend", "Frontend", "ML", "DevOps"]
    skills: list[str]
    experience: str = Field(max_length=3000)
    company: str = Field(max_length=160)
    position: str = Field(max_length=160)
    timezone: str = Field(max_length=100)
    default_meeting_url: str | None = Field(max_length=2048)
    accepting_students: bool

    @field_validator("default_meeting_url")
    @classmethod
    def telemost_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlparse(value)
        if parsed.scheme != "https" or parsed.hostname != "telemost.yandex.ru":
            raise ValueError("Укажите HTTPS-ссылку на Телемост")
        return value


class MentorProfileResponse(MentorProfileUpdate, OrmResponse):
    user_id: UUID
    name: str = ""
    avatar_url: str | None = None
    status: str


class AssignmentResponse(OrmResponse):
    id: UUID
    student_id: UUID
    mentor_id: UUID
    status: str
    end_reason: str | None
    created_at: datetime
    ended_at: datetime | None


class SlotCreate(BaseModel):
    starts_at: datetime
    duration_minutes: Literal[60, 75, 90]


class SlotResponse(SlotCreate, OrmResponse):
    id: UUID
    mentor_id: UUID
    status: str


class MeetingCreate(BaseModel):
    slot_id: UUID


class MeetingResponse(OrmResponse):
    id: UUID
    student_id: UUID
    mentor_id: UUID
    slot_id: UUID
    starts_at: datetime
    duration_minutes: int
    status: str
    meeting_url: str | None
    cancellation_reason: str | None


class ReflectionCreate(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class ReflectionResponse(OrmResponse):
    id: UUID
    meeting_id: UUID
    author_user_id: UUID
    author_role: str
    text: str


class NotificationResponse(OrmResponse):
    id: UUID
    title: str
    body: str
    is_read: bool
    created_at: datetime
