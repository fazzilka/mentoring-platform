from fastapi import APIRouter

from src.api.v1.assignments.schemas import AssignmentCreate, AssignmentResponse
from src.core.di.services import AssignmentDep
from src.core.di.session import CurrentUserDep

router = APIRouter(tags=["platform"])


@router.get("/assignments/me", response_model=list[AssignmentResponse])
async def my_assignments(user: CurrentUserDep, service: AssignmentDep) -> list[AssignmentResponse]:
    return [AssignmentResponse.model_validate(item) for item in await service.assignments(user)]


@router.post("/assignments", response_model=AssignmentResponse, status_code=201)
async def choose_mentor(
    data: AssignmentCreate, user: CurrentUserDep, service: AssignmentDep
) -> AssignmentResponse:
    return AssignmentResponse.model_validate(await service.assign_mentor(user, data.mentor_id))
