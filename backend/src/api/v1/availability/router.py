from uuid import UUID

from fastapi import APIRouter

from src.api.v1.availability.schemas import SlotCreate, SlotResponse, SlotUpdate
from src.core.db.dto import SlotData
from src.core.di.services import AvailabilityDep
from src.core.di.session import CurrentUserDep

router = APIRouter(tags=["platform"])


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
