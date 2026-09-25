import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import update

from src.api.v1.dependencies import CurrentUserDep, DbSession
from src.dao import auth as auth_dao
from src.dao import domain as dao
from src.models import Notification
from src.schemas.domain import (
    AssignmentResponse,
    MeetingCreate,
    MeetingResponse,
    MentorProfileResponse,
    MentorProfileUpdate,
    NotificationResponse,
    ReflectionCreate,
    ReflectionResponse,
    SlotCreate,
    SlotResponse,
    StudentProfileResponse,
    StudentProfileUpdate,
)
from src.services import domain as service

router = APIRouter(tags=["platform"])


def mentor_response(profile: object, name: str, avatar_url: str | None) -> MentorProfileResponse:
    return MentorProfileResponse.model_validate(profile).model_copy(
        update={"name": name, "avatar_url": avatar_url}
    )


@router.get("/profiles/student/me", response_model=StudentProfileResponse)
async def my_student_profile(user: CurrentUserDep, db: DbSession) -> StudentProfileResponse:
    await service.require_role(db, user.id, "student")
    profile = await dao.student_profile(db, user.id)
    if profile is None:
        raise HTTPException(404, "Профиль ученика не найден")
    return StudentProfileResponse.model_validate(profile)


@router.put("/profiles/student/me", response_model=StudentProfileResponse)
async def save_student_profile(
    data: StudentProfileUpdate, user: CurrentUserDep, db: DbSession
) -> StudentProfileResponse:
    profile = await service.update_student_profile(db, user, data)
    return StudentProfileResponse.model_validate(profile)


@router.get("/profiles/mentor/me", response_model=MentorProfileResponse)
async def my_mentor_profile(user: CurrentUserDep, db: DbSession) -> MentorProfileResponse:
    await service.require_role(db, user.id, "mentor")
    profile = await dao.mentor_profile(db, user.id)
    if profile is None:
        raise HTTPException(404, "Профиль наставника не найден")
    return mentor_response(profile, user.name, user.avatar_url)


@router.put("/profiles/mentor/me", response_model=MentorProfileResponse)
async def save_mentor_profile(
    data: MentorProfileUpdate, user: CurrentUserDep, db: DbSession
) -> MentorProfileResponse:
    profile = await service.update_mentor_profile(db, user, data)
    return mentor_response(profile, user.name, user.avatar_url)


@router.post("/profiles/mentor/depart", status_code=204)
async def depart_mentor(user: CurrentUserDep, db: DbSession) -> None:
    await service.depart_mentor(db, user)


@router.get("/mentors", response_model=list[MentorProfileResponse])
async def mentor_catalog(
    user: CurrentUserDep,
    db: DbSession,
    search: str | None = Query(default=None, max_length=160),
    specialization: Literal["Backend", "Frontend", "ML", "DevOps"] | None = None,
) -> list[MentorProfileResponse]:
    await service.require_role(db, user.id, "student")
    rows = await dao.catalog(db, search, specialization)
    return [mentor_response(profile, person.name, person.avatar_url) for profile, person in rows]


@router.get("/mentors/{mentor_id}", response_model=MentorProfileResponse)
async def mentor_details(
    mentor_id: uuid.UUID, user: CurrentUserDep, db: DbSession
) -> MentorProfileResponse:
    await service.require_role(db, user.id, "student")
    assignment = await dao.active_assignment(db, user.id)
    if assignment and assignment.mentor_id != mentor_id:
        raise HTTPException(403, "Можно просматривать только своего наставника")
    profile = await dao.mentor_profile(db, mentor_id)
    person = await auth_dao.get_user(db, mentor_id)
    if profile is None or person is None:
        raise HTTPException(404, "Наставник не найден")
    return mentor_response(profile, person.name, person.avatar_url)


@router.get("/assignments/me", response_model=list[AssignmentResponse])
async def my_assignments(user: CurrentUserDep, db: DbSession) -> list[AssignmentResponse]:
    await service.require_role(db, user.id, "student")
    return [AssignmentResponse.model_validate(item) for item in await dao.assignments(db, user.id)]


@router.post("/assignments/{mentor_id}", response_model=AssignmentResponse, status_code=201)
async def choose_mentor(
    mentor_id: uuid.UUID, user: CurrentUserDep, db: DbSession
) -> AssignmentResponse:
    return AssignmentResponse.model_validate(await service.assign_mentor(db, user, mentor_id))


@router.get("/students", response_model=list[dict[str, str]])
async def my_students(user: CurrentUserDep, db: DbSession) -> list[dict[str, str]]:
    await service.require_role(db, user.id, "mentor")
    return [
        {"id": str(person.id), "name": person.name}
        for person in await dao.mentor_students(db, user.id)
    ]


@router.get("/students/{student_id}", response_model=StudentProfileResponse)
async def student_details(
    student_id: uuid.UUID, user: CurrentUserDep, db: DbSession
) -> StudentProfileResponse:
    await service.require_role(db, user.id, "mentor")
    assignment = await dao.active_assignment(db, student_id)
    if assignment is None or assignment.mentor_id != user.id:
        raise HTTPException(404, "Ученик не найден")
    profile = await dao.student_profile(db, student_id)
    if profile is None:
        raise HTTPException(404, "Профиль ученика не найден")
    return StudentProfileResponse.model_validate(profile)


@router.get("/mentors/{mentor_id}/slots", response_model=list[SlotResponse])
async def mentor_slots(
    mentor_id: uuid.UUID, user: CurrentUserDep, db: DbSession
) -> list[SlotResponse]:
    if user.id != mentor_id:
        await service.require_role(db, user.id, "student")
        assignment = await dao.active_assignment(db, user.id)
        if assignment and assignment.mentor_id != mentor_id:
            raise HTTPException(403, "Слоты доступны только у своего наставника")
        if assignment is None:
            profile = await dao.mentor_profile(db, mentor_id)
            if profile is None or profile.status != "active" or not profile.accepting_students:
                raise HTTPException(404, "Наставник недоступен")
    return [SlotResponse.model_validate(item) for item in await dao.slots(db, mentor_id)]


@router.post("/slots", response_model=SlotResponse, status_code=201)
async def create_slot(data: SlotCreate, user: CurrentUserDep, db: DbSession) -> SlotResponse:
    return SlotResponse.model_validate(await service.add_slot(db, user, data))


@router.delete("/slots/{slot_id}", status_code=204)
async def remove_slot(slot_id: uuid.UUID, user: CurrentUserDep, db: DbSession) -> None:
    await service.delete_slot(db, user, slot_id)


@router.get("/meetings", response_model=list[MeetingResponse])
async def my_meetings(user: CurrentUserDep, db: DbSession) -> list[MeetingResponse]:
    return [MeetingResponse.model_validate(item) for item in await dao.meetings(db, user.id)]


@router.post("/meetings", response_model=MeetingResponse, status_code=201)
async def create_meeting(
    data: MeetingCreate, user: CurrentUserDep, db: DbSession
) -> MeetingResponse:
    return MeetingResponse.model_validate(await service.request_meeting(db, user, data.slot_id))


@router.post("/meetings/{meeting_id}/{action}", response_model=MeetingResponse)
async def meeting_action(
    meeting_id: uuid.UUID,
    action: Literal["confirm", "reject", "complete", "cancel"],
    user: CurrentUserDep,
    db: DbSession,
) -> MeetingResponse:
    return MeetingResponse.model_validate(
        await service.change_meeting(db, user, meeting_id, action)
    )


@router.get("/meetings/{meeting_id}/reflections", response_model=list[ReflectionResponse])
async def reflections(
    meeting_id: uuid.UUID, user: CurrentUserDep, db: DbSession
) -> list[ReflectionResponse]:
    meeting = await dao.meeting(db, meeting_id)
    if meeting is None or user.id not in (meeting.student_id, meeting.mentor_id):
        raise HTTPException(404, "Встреча не найдена")
    items = await dao.meeting_reflections(db, meeting_id)
    if user.id == meeting.student_id:
        items = [item for item in items if item.author_user_id == user.id]
    return [ReflectionResponse.model_validate(item) for item in items]


@router.post(
    "/meetings/{meeting_id}/reflections", response_model=ReflectionResponse, status_code=201
)
async def create_reflection(
    meeting_id: uuid.UUID, data: ReflectionCreate, user: CurrentUserDep, db: DbSession
) -> ReflectionResponse:
    return ReflectionResponse.model_validate(
        await service.add_reflection(db, user, meeting_id, data.text)
    )


@router.get("/notifications", response_model=list[NotificationResponse])
async def my_notifications(user: CurrentUserDep, db: DbSession) -> list[NotificationResponse]:
    return [
        NotificationResponse.model_validate(item) for item in await dao.notifications(db, user.id)
    ]


@router.post("/notifications/read-all", status_code=204)
async def read_all_notifications(user: CurrentUserDep, db: DbSession) -> None:
    await db.execute(
        update(Notification).where(Notification.user_id == user.id).values(is_read=True)
    )
    await db.commit()
