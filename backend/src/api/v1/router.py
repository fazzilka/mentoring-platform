from fastapi import APIRouter

from src.api.v1.assignments.router import router as assignments_router
from src.api.v1.auth.router import router as auth_router
from src.api.v1.availability.router import router as availability_router
from src.api.v1.meetings.router import router as meetings_router
from src.api.v1.notifications.router import router as notifications_router
from src.api.v1.people.router import router as people_router
from src.api.v1.reflections.router import router as reflections_router

router = APIRouter(prefix="/api/v1")
router.include_router(people_router)
router.include_router(assignments_router)
router.include_router(availability_router)
router.include_router(reflections_router)
router.include_router(meetings_router)
router.include_router(notifications_router)
router.include_router(auth_router)
