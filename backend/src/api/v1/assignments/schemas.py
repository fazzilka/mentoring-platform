from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from src.api.v1.schemas import OrmResponse


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
