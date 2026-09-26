from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query

from src.api.v1.dependencies import CurrentUserDep
from src.api.v1.services import (
    AssignmentDep,
    AvailabilityDep,
    MeetingDep,
    NotificationDep,
    ProfileDep,
    ReflectionDep,
)
from src.schemas.domain import (
    AssignmentCreate,
    AssignmentResponse,
    MeetingCancel,
    MeetingCreate,
    MeetingResponse,
    MentorProfileCreate,
    MentorProfileResponse,
    MentorProfileUpdate,
    NotificationResponse,
    ReflectionCreate,
    ReflectionResponse,
    ReflectionUpdate,
    SlotCreate,
    SlotResponse,
    SlotUpdate,
    StudentProfileCreate,
    StudentProfileResponse,
    StudentProfileUpdate,
)
from src.services.dto import MentorProfileData, SlotData, StudentProfileData

router = APIRouter(tags=["platform"])


@router.get("/profiles/student/me", response_model=StudentProfileResponse)
async def my_student_profile(user: CurrentUserDep, service: ProfileDep) -> StudentProfileResponse:
    return StudentProfileResponse.model_validate(await service.student_profile(user))


@router.post("/profiles/student/me", response_model=StudentProfileResponse, status_code=201)
async def create_student_profile(
    data: StudentProfileCreate, user: CurrentUserDep, service: ProfileDep
) -> StudentProfileResponse:
    return StudentProfileResponse.model_validate(
        await service.create_student_profile(user, StudentProfileData(**data.model_dump()))
    )


@router.put("/profiles/student/me", response_model=StudentProfileResponse)
async def save_student_profile(
    data: StudentProfileUpdate, user: CurrentUserDep, service: ProfileDep
) -> StudentProfileResponse:
    return StudentProfileResponse.model_validate(
        await service.update_student_profile(user, StudentProfileData(**data.model_dump()))
    )


@router.get("/profiles/mentor/me", response_model=MentorProfileResponse)
async def my_mentor_profile(user: CurrentUserDep, service: ProfileDep) -> MentorProfileResponse:
    return MentorProfileResponse.model_validate(await service.mentor_profile(user)).model_copy(
        update={"name": user.name, "avatar_url": user.avatar_url, "timezone": user.timezone}
    )


@router.post("/profiles/mentor/me", response_model=MentorProfileResponse, status_code=201)
async def create_mentor_profile(
    data: MentorProfileCreate, user: CurrentUserDep, service: ProfileDep
) -> MentorProfileResponse:
    return MentorProfileResponse.model_validate(
        await service.create_mentor_profile(user, MentorProfileData(**data.model_dump()))
    ).model_copy(
        update={"name": user.name, "avatar_url": user.avatar_url, "timezone": user.timezone}
    )


@router.put("/profiles/mentor/me", response_model=MentorProfileResponse)
async def save_mentor_profile(
    data: MentorProfileUpdate, user: CurrentUserDep, service: ProfileDep
) -> MentorProfileResponse:
    return MentorProfileResponse.model_validate(
        await service.update_mentor_profile(user, MentorProfileData(**data.model_dump()))
    ).model_copy(
        update={"name": user.name, "avatar_url": user.avatar_url, "timezone": user.timezone}
    )


@router.post("/profiles/mentor/depart", status_code=204)
async def depart_mentor(user: CurrentUserDep, service: AssignmentDep) -> None:
    await service.depart_mentor(user)


@router.get("/mentors", response_model=list[MentorProfileResponse])
async def mentor_catalog(
    user: CurrentUserDep,
    service: ProfileDep,
    search: str | None = Query(default=None, max_length=160),
    specialization: Literal["Backend", "Frontend", "ML", "DevOps"] | None = None,
) -> list[MentorProfileResponse]:
    return [
        MentorProfileResponse.model_validate(profile).model_copy(
            update={
                "name": person.name,
                "avatar_url": person.avatar_url,
                "timezone": person.timezone,
            }
        )
        for profile, person in await service.catalog(user, search, specialization)
    ]


@router.get("/mentors/{mentor_id}", response_model=MentorProfileResponse)
async def mentor_details(
    mentor_id: UUID, user: CurrentUserDep, service: ProfileDep
) -> MentorProfileResponse:
    profile, person = await service.mentor_details(user, mentor_id)
    return MentorProfileResponse.model_validate(profile).model_copy(
        update={"name": person.name, "avatar_url": person.avatar_url, "timezone": person.timezone}
    )


@router.get("/assignments/me", response_model=list[AssignmentResponse])
async def my_assignments(user: CurrentUserDep, service: AssignmentDep) -> list[AssignmentResponse]:
    return [AssignmentResponse.model_validate(item) for item in await service.assignments(user)]


@router.post("/assignments", response_model=AssignmentResponse, status_code=201)
async def choose_mentor(
    data: AssignmentCreate, user: CurrentUserDep, service: AssignmentDep
) -> AssignmentResponse:
    return AssignmentResponse.model_validate(await service.assign_mentor(user, data.mentor_id))


@router.get("/students", response_model=list[dict[str, str]])
async def my_students(user: CurrentUserDep, service: ProfileDep) -> list[dict[str, str]]:
    return [{"id": str(person.id), "name": person.name} for person in await service.students(user)]


@router.get("/students/{student_id}", response_model=StudentProfileResponse)
async def student_details(
    student_id: UUID, user: CurrentUserDep, service: ProfileDep
) -> StudentProfileResponse:
    return StudentProfileResponse.model_validate(await service.student_details(user, student_id))


@router.get("/mentors/{mentor_id}/slots", response_model=list[SlotResponse])
async def mentor_slots(
    mentor_id: UUID, user: CurrentUserDep, service: AvailabilityDep
) -> list[SlotResponse]:
    return [SlotResponse.model_validate(item) for item in await service.slots(user, mentor_id)]


@router.post("/slots", response_model=SlotResponse, status_code=201)
async def create_slot(
    data: SlotCreate, user: CurrentUserDep, service: AvailabilityDep
) -> SlotResponse:
    return SlotResponse.model_validate(await service.add_slot(user, SlotData(**data.model_dump())))


@router.put("/slots/{slot_id}", response_model=SlotResponse)
async def update_slot(
    slot_id: UUID, data: SlotUpdate, user: CurrentUserDep, service: AvailabilityDep
) -> SlotResponse:
    return SlotResponse.model_validate(
        await service.update_slot(user, slot_id, SlotData(**data.model_dump()))
    )


@router.delete("/slots/{slot_id}", status_code=204)
async def remove_slot(slot_id: UUID, user: CurrentUserDep, service: AvailabilityDep) -> None:
    await service.delete_slot(user, slot_id)


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


@router.post("/meetings/{meeting_id}/cancel", response_model=MeetingResponse)
async def cancel_meeting(
    meeting_id: UUID, user: CurrentUserDep, service: MeetingDep, data: MeetingCancel | None = None
) -> MeetingResponse:
    return MeetingResponse.model_validate(
        await service.change_meeting(user, meeting_id, "cancel", data.reason if data else None)
    )


@router.get("/meetings/{meeting_id}/reflections", response_model=list[ReflectionResponse])
async def reflections(
    meeting_id: UUID, user: CurrentUserDep, service: ReflectionDep
) -> list[ReflectionResponse]:
    return [
        ReflectionResponse.model_validate(item)
        for item in await service.reflections(user, meeting_id)
    ]


@router.post(
    "/meetings/{meeting_id}/reflections", response_model=ReflectionResponse, status_code=201
)
async def create_reflection(
    meeting_id: UUID, data: ReflectionCreate, user: CurrentUserDep, service: ReflectionDep
) -> ReflectionResponse:
    return ReflectionResponse.model_validate(
        await service.add_reflection(user, meeting_id, data.summary, data.next_step)
    )


@router.post("/meetings/{meeting_id}/{action}", response_model=MeetingResponse)
async def meeting_action(
    meeting_id: UUID,
    action: Literal["confirm", "reject", "complete"],
    user: CurrentUserDep,
    service: MeetingDep,
) -> MeetingResponse:
    return MeetingResponse.model_validate(await service.change_meeting(user, meeting_id, action))


@router.put("/reflections/{reflection_id}", response_model=ReflectionResponse)
async def edit_reflection(
    reflection_id: UUID, data: ReflectionUpdate, user: CurrentUserDep, service: ReflectionDep
) -> ReflectionResponse:
    return ReflectionResponse.model_validate(
        await service.edit_reflection(user, reflection_id, data.summary, data.next_step)
    )


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
