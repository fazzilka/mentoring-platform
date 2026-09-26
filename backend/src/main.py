from collections.abc import Awaitable, Callable
from time import perf_counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from src.api.v1.router import router as api_v1_router
from src.core.config import get_settings
from src.core.errors import DomainError
from src.core.security import jwt_secret
from src.schemas.health import HealthResponse

settings = get_settings()
jwt_secret()
app = FastAPI(title=settings.app_name, debug=settings.debug)
allowed_origins = [settings.frontend_origin]
request_count = Counter(
    "mentoring_http_requests_total", "HTTP requests", ["method", "route", "status"]
)
request_duration = Histogram(
    "mentoring_http_request_duration_seconds", "HTTP request duration", ["method", "route"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(api_v1_router)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, error: DomainError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content={"detail": error.detail})


@app.middleware("http")
async def record_metrics(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    started = perf_counter()
    response = await call_next(request)
    route = request.scope.get("route")
    route_name = getattr(route, "path", "unmatched")
    request_count.labels(request.method, route_name, str(response.status_code)).inc()
    request_duration.labels(request.method, route_name).observe(perf_counter() - started)
    return response


@app.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse()
