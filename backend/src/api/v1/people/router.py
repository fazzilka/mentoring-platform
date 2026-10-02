from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query

from src.api.v1.people.schemas import (
    MentorProfileCreate,
    MentorProfileResponse,
    MentorProfileUpdate,
    StudentProfileCreate,
    StudentProfileResponse,
    StudentProfileUpdate,
)
from src.core.db.dto import MentorProfileData, StudentProfileData
from src.core.di.services import (
    AssignmentDep,
    ProfileDep,
)
from src.core.di.session import CurrentUserDep

router = APIRouter(tags=["platform"])


@router.get("/profiles/student/me", response_model=StudentProfileResponse)
async def my_student_profile(user: CurrentUserDep, service: ProfileDep) -> StudentProfileResponse:
    return StudentProfileResponse.model_validate(await service.student_profile(user)).model_copy(
        update={
            "email": user.email,
            "telegram_username": user.telegram_username,
            "phone_number": user.phone_number,
        }
    )


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
        update={
            "name": user.name,
            "avatar_url": user.avatar_url,
            "timezone": user.timezone,
            "email": user.email,
            "telegram_username": user.telegram_username,
            "phone_number": user.phone_number,
        }
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
    profile, person, has_contact = await service.mentor_details_with_contact(user, mentor_id)
    contact = (
        {
            "email": person.email,
            "telegram_username": person.telegram_username,
            "phone_number": person.phone_number,
        }
        if has_contact
        else {}
    )
    return MentorProfileResponse.model_validate(profile).model_copy(
        update={
            "name": person.name,
            "avatar_url": person.avatar_url,
            "timezone": person.timezone,
            **contact,
        }
    )


@router.get("/students", response_model=list[dict[str, str]])
async def my_students(user: CurrentUserDep, service: ProfileDep) -> list[dict[str, str]]:
    return [{"id": str(person.id), "name": person.name} for person in await service.students(user)]


@router.get("/students/{student_id}", response_model=StudentProfileResponse)
async def student_details(
    student_id: UUID, user: CurrentUserDep, service: ProfileDep
) -> StudentProfileResponse:
    profile, person = await service.student_details(user, student_id)
    return StudentProfileResponse.model_validate(profile).model_copy(
        update={
            "email": person.email,
            "telegram_username": person.telegram_username,
            "phone_number": person.phone_number,
        }
    )
