from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.api.v1.schemas import OrmResponse


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
