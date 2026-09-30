from uuid import UUID

from fastapi import APIRouter

from src.api.v1.reflections.schemas import ReflectionCreate, ReflectionResponse, ReflectionUpdate
from src.core.di.services import ReflectionDep
from src.core.di.session import CurrentUserDep

router = APIRouter(tags=["platform"])


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


@router.put("/reflections/{reflection_id}", response_model=ReflectionResponse)
async def edit_reflection(
    reflection_id: UUID, data: ReflectionUpdate, user: CurrentUserDep, service: ReflectionDep
) -> ReflectionResponse:
    return ReflectionResponse.model_validate(
        await service.edit_reflection(user, reflection_id, data.summary, data.next_step)
    )
