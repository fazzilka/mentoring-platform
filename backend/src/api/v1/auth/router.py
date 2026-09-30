from fastapi import APIRouter, HTTPException, Request, Response

from src.api.v1.auth.dto import RegistrationData, TokenPair, UserProfileData
from src.api.v1.auth.schemas import (
    AccessToken,
    CurrentUser,
    LoginRequest,
    RegisterRequest,
    UserUpdate,
)
from src.config.config import get_settings
from src.core.di.services import AuthDep
from src.core.di.session import CurrentUserDep

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "mentoring_refresh"
COOKIE_PATH = "/api/v1/auth"


def check_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin is not None and origin != get_settings().frontend_origin:
        raise HTTPException(403, "Недопустимый Origin")


def token_response(response: Response, tokens: TokenPair) -> AccessToken:
    settings = get_settings()
    response.set_cookie(
        COOKIE,
        tokens.refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.refresh_cookie_secure or settings.environment == "production",
        path=COOKIE_PATH,
        max_age=settings.refresh_token_days * 86400,
    )
    response.headers["Cache-Control"] = "no-store"
    return AccessToken(
        access_token=tokens.access_token, expires_in=settings.access_token_minutes * 60
    )


@router.post("/register", response_model=AccessToken, status_code=201)
async def register(
    data: RegisterRequest, request: Request, response: Response, service: AuthDep
) -> AccessToken:
    check_origin(request)
    return token_response(response, await service.register(RegistrationData(**data.model_dump())))


@router.post("/login", response_model=AccessToken)
async def login(
    data: LoginRequest, request: Request, response: Response, service: AuthDep
) -> AccessToken:
    check_origin(request)
    return token_response(response, await service.login(data.email, data.password))


@router.post("/refresh", response_model=AccessToken)
async def refresh(request: Request, response: Response, service: AuthDep) -> AccessToken:
    check_origin(request)
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, "Refresh cookie отсутствует")
    return token_response(response, await service.refresh(token))


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, service: AuthDep) -> None:
    check_origin(request)
    token = request.cookies.get(COOKIE)
    await service.logout(token)
    response.delete_cookie(COOKIE, path=COOKIE_PATH)
    response.headers["Cache-Control"] = "no-store"


@router.get("/me", response_model=CurrentUser)
async def me(user: CurrentUserDep, service: AuthDep, response: Response) -> CurrentUser:
    response.headers["Cache-Control"] = "no-store"
    return CurrentUser.model_validate(user).model_copy(update={"roles": await service.roles(user)})


@router.put("/me", response_model=CurrentUser)
async def update_me(data: UserUpdate, user: CurrentUserDep, service: AuthDep) -> CurrentUser:
    roles = await service.update_user(user, UserProfileData(**data.model_dump()))
    return CurrentUser.model_validate(user).model_copy(update={"roles": roles})
