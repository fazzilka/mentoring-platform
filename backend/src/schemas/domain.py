from datetime import datetime
from typing import Literal
from urllib.parse import urlparse
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator


class OrmResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)


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
    def telemost_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlparse(value)
        if parsed.scheme != "https" or parsed.hostname != "telemost.yandex.ru" or parsed.username:
            raise ValueError("Укажите HTTPS-ссылку на Телемост")
        return value


class MentorProfileUpdate(MentorProfileCreate):
    pass


class MentorProfileResponse(MentorProfileCreate, OrmResponse):
    user_id: UUID
    name: str = ""
    avatar_url: str | None = None
    timezone: str


class AssignmentCreate(BaseModel):
    mentor_id: UUID


class AssignmentResponse(OrmResponse):
    id: UUID
    student_id: UUID
    mentor_id: UUID
    status: Literal["active", "ended"]
    started_at: datetime
    ended_at: datetime | None
    end_reason: str | None


class SlotCreate(BaseModel):
    starts_at: AwareDatetime
    duration_minutes: Literal[60, 75, 90]


class SlotUpdate(SlotCreate):
    pass


class SlotResponse(SlotCreate, OrmResponse):
    id: UUID
    mentor_id: UUID
    state: Literal["free", "pending", "booked"]
    created_at: datetime


class MeetingCreate(BaseModel):
    availability_slot_id: UUID


class MeetingCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=160)


class MeetingResponse(OrmResponse):
    id: UUID
    student_id: UUID
    mentor_id: UUID
    student_name: str
    mentor_name: str
    assignment_id: UUID
    availability_slot_id: UUID
    starts_at: datetime
    duration_minutes: Literal[60, 75, 90]
    status: Literal["pending", "confirmed", "completed", "cancelled"]
    meeting_url: str | None
    cancelled_by: UUID | None
    cancellation_reason: str | None
    created_at: datetime
    updated_at: datetime


class ReflectionCreate(BaseModel):
    summary: str = Field(min_length=1, max_length=5000)
    next_step: str | None = Field(default=None, max_length=3000)

    @field_validator("summary")
    @classmethod
    def non_empty_summary(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Заметка не может быть пустой")
        return value


class ReflectionUpdate(ReflectionCreate):
    pass


class ReflectionResponse(ReflectionCreate, OrmResponse):
    id: UUID
    meeting_id: UUID
    author_id: UUID
    created_at: datetime
    updated_at: datetime


class NotificationResponse(OrmResponse):
    id: UUID
    user_id: UUID
    meeting_id: UUID | None
    type: str
    title: str
    message: str
    read_at: datetime | None
    created_at: datetime
