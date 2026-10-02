from typing import Literal
from uuid import UUID

from fastapi import APIRouter

from src.api.v1.meetings.schemas import (
    MeetingCancel,
    MeetingConfirm,
    MeetingCreate,
    MeetingResponse,
    MentorMeetingCreate,
)
from src.core.di.services import (
    MeetingDep,
)
from src.core.di.session import CurrentUserDep

router = APIRouter(tags=["platform"])


@router.get("/meetings", response_model=list[MeetingResponse])
async def my_meetings(user: CurrentUserDep, service: MeetingDep) -> list[MeetingResponse]:
    return [MeetingResponse.model_validate(item) for item in await service.meetings(user)]


@router.get("/meetings/{meeting_id}", response_model=MeetingResponse)
async def meeting_details(
    meeting_id: UUID, user: CurrentUserDep, service: MeetingDep
) -> MeetingResponse:
    return MeetingResponse.model_validate(await service.meeting(user, meeting_id))


@router.post("/meetings", response_model=MeetingResponse, status_code=201)
async def create_meeting(
    data: MeetingCreate, user: CurrentUserDep, service: MeetingDep
) -> MeetingResponse:
    return MeetingResponse.model_validate(
        await service.request_meeting(user, data.availability_slot_id)
    )


@router.post("/meetings/mentor", response_model=MeetingResponse, status_code=201)
async def create_mentor_meeting(
    data: MentorMeetingCreate, user: CurrentUserDep, service: MeetingDep
) -> MeetingResponse:
    return MeetingResponse.model_validate(
        await service.create_mentor_meeting(
            user, data.student_id, data.availability_slot_id, data.meeting_url
        )
    )


@router.post("/meetings/{meeting_id}/cancel", response_model=MeetingResponse)
async def cancel_meeting(
    meeting_id: UUID, user: CurrentUserDep, service: MeetingDep, data: MeetingCancel | None = None
) -> MeetingResponse:
    return MeetingResponse.model_validate(
        await service.change_meeting(user, meeting_id, "cancel", data.reason if data else None)
    )


@router.post("/meetings/{meeting_id}/{action}", response_model=MeetingResponse)
async def meeting_action(
    meeting_id: UUID,
    action: Literal["confirm", "reject", "complete"],
    user: CurrentUserDep,
    service: MeetingDep,
    data: MeetingConfirm | None = None,
) -> MeetingResponse:
    return MeetingResponse.model_validate(
        await service.change_meeting(
            user, meeting_id, action, meeting_url=data.meeting_url if data else None
        )
    )
