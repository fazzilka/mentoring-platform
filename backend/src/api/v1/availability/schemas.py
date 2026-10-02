from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel

from src.api.v1.schemas import OrmResponse


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
