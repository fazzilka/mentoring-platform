from datetime import datetime
from uuid import UUID

from src.api.v1.schemas import OrmResponse


class NotificationResponse(OrmResponse):
    id: UUID
    user_id: UUID
    meeting_id: UUID | None
    type: str
    title: str
    message: str
    read_at: datetime | None
    created_at: datetime
