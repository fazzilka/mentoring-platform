from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.api.v1.schemas import OrmResponse
from src.core.validation import validate_meeting_url


class MeetingCreate(BaseModel):
    availability_slot_id: UUID


class MentorMeetingCreate(MeetingCreate):
    student_id: UUID
    meeting_url: str = Field(min_length=1, max_length=2048)

    @field_validator("meeting_url")
    @classmethod
    def validate_link(cls, value: str) -> str:
        return validate_meeting_url(value)


class MeetingConfirm(BaseModel):
    meeting_url: str | None = Field(default=None, max_length=2048)

    @field_validator("meeting_url")
    @classmethod
    def validate_link(cls, value: str | None) -> str | None:
        return validate_meeting_url(value) if value else None


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
