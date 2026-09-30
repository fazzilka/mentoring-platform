from uuid import UUID

from fastapi import APIRouter

from src.api.v1.notifications.schemas import NotificationResponse
from src.core.di.services import NotificationDep
from src.core.di.session import CurrentUserDep

router = APIRouter(tags=["platform"])


@router.get("/notifications", response_model=list[NotificationResponse])
async def my_notifications(
    user: CurrentUserDep, service: NotificationDep
) -> list[NotificationResponse]:
    return [NotificationResponse.model_validate(item) for item in await service.notifications(user)]


@router.post("/notifications/read-all", status_code=204)
async def read_all_notifications(user: CurrentUserDep, service: NotificationDep) -> None:
    await service.read_all(user)


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def read_notification(
    notification_id: UUID, user: CurrentUserDep, service: NotificationDep
) -> NotificationResponse:
    return NotificationResponse.model_validate(await service.read(user, notification_id))
