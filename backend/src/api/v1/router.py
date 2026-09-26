from fastapi import APIRouter

from src.api.v1.domain import router as domain_router

router = APIRouter(prefix="/api/v1")
router.include_router(domain_router)
